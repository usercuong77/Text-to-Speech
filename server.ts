import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to convert Linear PCM 16-bit to standard WAV Buffer
function pcm16ToWavBuffer(pcmBytes: Buffer, sampleRate = 24000, numChannels = 1): Buffer {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmBytes.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34); // 16-bit
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBytes]);
}

// Intelligently splits a long sentence into sub-chunks for Google TTS (< 180 chars)
// by prioritizing natural punctuation pauses (comma, semicolon, dash, colon)
// so the synthesized audio sounds continuous, smooth, and never drops tone awkwardly mid-phrase.
function splitTextForGoogleTTS(text: string, maxChars = 175): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return [trimmed];
  }

  const chunks: string[] = [];
  let remaining = trimmed;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining.trim());
      break;
    }

    const windowText = remaining.slice(0, maxChars);

    // 1. Prioritize natural punctuation pauses within the window: comma, semicolon, colon, dash, ellipsis
    let splitIdx = -1;
    const punctMatches = [...windowText.matchAll(/([,;:—–\)]|\.\.\.)\s+/g)];
    if (punctMatches.length > 0) {
      const lastPunct = punctMatches[punctMatches.length - 1];
      // Split right after the punctuation mark and its trailing space
      splitIdx = lastPunct.index! + lastPunct[0].length;
    }

    // 2. If no punctuation found in the window, search for major conjunctions in Vietnamese & English
    if (splitIdx === -1) {
      const conjMatches = [
        ...windowText.matchAll(
          /\s+(và|hoặc|nhưng|mà|để|khi|bởi|vì|rằng|thì|and|or|but|because|so|that|which|when)\s+/gi
        ),
      ];
      if (conjMatches.length > 0) {
        const lastConj = conjMatches[conjMatches.length - 1];
        splitIdx = lastConj.index!;
      }
    }

    // 3. Fallback to the last word space in the window
    if (splitIdx === -1) {
      splitIdx = windowText.lastIndexOf(" ");
    }

    // 4. Hard fallback if no spaces exist (e.g. single giant word)
    if (splitIdx <= 0) {
      splitIdx = maxChars;
    }

    const chunk = remaining.slice(0, splitIdx).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    remaining = remaining.slice(splitIdx).trim();
  }

  return chunks.filter((c) => c.length > 0);
}

// Helper to fetch complete Google TTS audio for arbitrary length text without truncation or unnatural cuts
async function fetchGoogleTTSBuffer(text: string, lang: string): Promise<Buffer> {
  const subChunks = splitTextForGoogleTTS(text, 175);

  const audioBuffers: Buffer[] = [];
  for (const chunk of subChunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(
      chunk
    )}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
    } else {
      console.warn(`TTS subchunk fetch failed with status ${response.status} for: ${chunk.slice(0, 30)}`);
    }
  }

  if (audioBuffers.length === 0) {
    throw new Error("Không thể tải luồng âm thanh.");
  }

  return Buffer.concat(audioBuffers);
}

// Concurrency limiter for Edge TTS to prevent overwhelming Microsoft endpoints while allowing parallel requests
function createLimiter(maxConcurrent: number) {
  let running = 0;
  const queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  function run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      pump();
    });
  }

  function pump() {
    while (running < maxConcurrent && queue.length > 0) {
      running++;
      const item = queue.shift()!;
      item.fn()
        .then(item.resolve, item.reject)
        .finally(() => {
          running--;
          pump();
        });
    }
  }

  return run;
}

const edgeLimiter = createLimiter(3);

async function fetchEdgeTTSBuffer(text: string, voiceName: string, rate?: string): Promise<Buffer> {
  return edgeLimiter(async () => {
    let lastError: any;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const tts = new MsEdgeTTS();
      try {
        await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const options: any = {};
        if (rate && rate !== "+0%" && rate !== "0%") options.rate = rate;

        const buffer = await new Promise<Buffer>((resSingle, rejSingle) => {
          let isSettled = false;
          const timeout = setTimeout(() => {
            if (!isSettled) {
              isSettled = true;
              try {
                tts.close();
              } catch {}
              rejSingle(new Error("Edge TTS timed out after 3500ms"));
            }
          }, 3500);

          const { audioStream } = tts.toStream(text, options);
          const chunks: Buffer[] = [];

          audioStream.on("error", (err: any) => {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timeout);
              try {
                tts.close();
              } catch {}
              rejSingle(err);
            }
          });

          audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
          audioStream.on("end", () => {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timeout);
              setTimeout(() => {
                try {
                  tts.close();
                } catch {}
              }, 50);
              resSingle(Buffer.concat(chunks));
            }
          });
        });

        if (buffer && buffer.length > 200) {
          return buffer;
        }
      } catch (err: any) {
        lastError = err;
        try {
          tts.close();
        } catch {}
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 60));
        }
      }
    }
    throw lastError || new Error("Failed to synthesize audio with Edge TTS");
  });
}

// In-memory audio cache for instant repeated sentence playback
const audioCache = new Map<string, Buffer>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Audio stream endpoint: Supports Studio Neural (Nam Minh, Hoài My, Guy, Jenny), Gemini AI, and Google
  app.get("/api/tts/stream", async (req, res) => {
    try {
      const rawText = typeof req.query.text === "string" ? req.query.text.trim() : "";
      const rawVoice = typeof req.query.voice === "string" ? req.query.voice.trim() : "";
      const rawGender = typeof req.query.gender === "string" ? req.query.gender.trim().toLowerCase() : "";
      const rawLang = typeof req.query.lang === "string" ? req.query.lang.trim().toLowerCase() : "vi";
      const lang = rawLang.startsWith("en") ? "en" : "vi";

      if (!rawText) {
        return res.status(400).send("Thiếu nội dung văn bản.");
      }

      // Sanitize text: strip markdown asterisks, hashes, brackets, and emojis so TTS never speaks "sao sao" or symbols
      const text = rawText
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/[*#_~`^\\|<>\[\]{}]+/g, " ")
        .replace(/[•⁃◦▪▫★☆✔✓✦✧■□●○◆◇▲△▼▽🌱🌿🌾🍃✨]/gu, " ")
        .replace(/[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/gu, " ")
        .replace(/[""«»]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!text) {
        return res.status(400).send("Nội dung sau khi lọc rỗng.");
      }

      // Parse speed and calculate Edge TTS rate string (+20%, -15%, etc.)
      const speedParam = Math.max(0.5, Math.min(2.0, parseFloat(req.query.speed as string) || 1.0));
      let edgeRate: string | undefined;
      if (Math.abs(speedParam - 1.0) >= 0.05) {
        const percent = Math.round((speedParam - 1) * 100);
        edgeRate = percent >= 0 ? `+${percent}%` : `${percent}%`;
      }

      const isMale =
        rawGender === "male" ||
        rawVoice === "male" ||
        rawVoice.toLowerCase().includes("nam") ||
        rawVoice.toLowerCase().includes("minh") ||
        rawVoice.toLowerCase().includes("fenrir") ||
        rawVoice.toLowerCase().includes("charon") ||
        rawVoice.toLowerCase().includes("puck") ||
        rawVoice.toLowerCase().includes("guy");

      // Resolve voice name based on input, gender, and language
      let targetVoice = rawVoice;
      if (!targetVoice || targetVoice === "male" || targetVoice === "female") {
        if (isMale) {
          targetVoice = lang === "en" ? "en-US-GuyNeural" : "vi-VN-NamMinhNeural";
        } else {
          targetVoice = lang === "en" ? "en-US-JennyNeural" : "vi-VN-HoaiMyNeural";
        }
      }

      const cacheKey = `${targetVoice}:${lang}:${edgeRate || "1.0"}:${text}`;
      if (audioCache.has(cacheKey)) {
        const cached = audioCache.get(cacheKey)!;
        res.setHeader("Content-Type", targetVoice.startsWith("gemini-") ? "audio/wav" : "audio/mpeg");
        res.setHeader("Content-Length", cached.length);
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
        return res.send(cached);
      }

      // 1. If Gemini Voice requested (gemini-Fenrir, gemini-Charon, gemini-Puck, gemini-Kore, gemini-Aoede)
      if (targetVoice.startsWith("gemini-")) {
        const geminiVoiceName = targetVoice.replace("gemini-", "");
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
          try {
            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: { headers: { "User-Agent": "aistudio-build" } },
            });
            const response = await ai.models.generateContent({
              model: "gemini-3.1-flash-tts-preview",
              contents: [{ parts: [{ text: text.slice(0, 800) }] }],
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: geminiVoiceName },
                  },
                },
              },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const pcmBytes = Buffer.from(base64Audio, "base64");
              const wavBuffer = pcm16ToWavBuffer(pcmBytes, 24000, 1);
              if (audioCache.size > 200) {
                const firstKey = audioCache.keys().next().value;
                if (firstKey) audioCache.delete(firstKey);
              }
              audioCache.set(cacheKey, wavBuffer);
              res.setHeader("Content-Type", "audio/wav");
              res.setHeader("Content-Length", wavBuffer.length);
              res.setHeader("Cache-Control", "public, max-age=86400");
              return res.send(wavBuffer);
            }
          } catch (geminiErr: any) {
            console.warn("Gemini voice live stream failed, falling back to Studio Neural:", geminiErr?.message);
          }
        }
        // Fallback for Gemini voice: strictly preserve gender!
        targetVoice =
          geminiVoiceName === "Fenrir" || geminiVoiceName === "Charon" || geminiVoiceName === "Puck"
            ? "vi-VN-NamMinhNeural"
            : "vi-VN-HoaiMyNeural";
      }

      // 2. If Google Standard requested
      if (targetVoice === "google-vi" || targetVoice === "google-en") {
        const googleBuf = await fetchGoogleTTSBuffer(text, lang);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", googleBuf.length);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(googleBuf);
      }

      // 3. Studio Neural Voices (Default: Nam Minh Male or Hoài My Female)
      let neuralVoice = targetVoice;
      if (neuralVoice === "male" || neuralVoice === "nam") {
        neuralVoice = lang === "en" ? "en-US-GuyNeural" : "vi-VN-NamMinhNeural";
      } else if (neuralVoice === "female" || neuralVoice === "nu") {
        neuralVoice = lang === "en" ? "en-US-JennyNeural" : "vi-VN-HoaiMyNeural";
      } else if (!neuralVoice.includes("Neural")) {
        neuralVoice = isMale ? "vi-VN-NamMinhNeural" : "vi-VN-HoaiMyNeural";
      }

      try {
        const edgeBuffer = await fetchEdgeTTSBuffer(text, neuralVoice, edgeRate);
        if (audioCache.size > 1000) {
          const firstKey = audioCache.keys().next().value;
          if (firstKey) audioCache.delete(firstKey);
        }
        audioCache.set(cacheKey, edgeBuffer);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", edgeBuffer.length);
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
        return res.send(edgeBuffer);
      } catch (edgeErr: any) {
        console.warn(`Edge TTS failed for voice ${neuralVoice}:`, edgeErr?.message);

        // Strict gender isolation: NEVER fallback to Google Female TTS when Male voice is requested!
        if (isMale) {
          const apiKey = process.env.GEMINI_API_KEY;
          if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
            try {
              const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
              const geminiRes = await ai.models.generateContent({
                model: "gemini-3.1-flash-tts-preview",
                contents: [{ parts: [{ text: text.slice(0, 800) }] }],
                config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: "Fenrir" } },
                  },
                },
              });
              const b64 = geminiRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
              if (b64) {
                const wavBuf = pcm16ToWavBuffer(Buffer.from(b64, "base64"), 24000, 1);
                res.setHeader("Content-Type", "audio/wav");
                res.setHeader("Content-Length", wavBuf.length);
                return res.send(wavBuf);
              }
            } catch (gErr) {
              console.warn("Gemini male fallback failed:", gErr);
            }
          }
          if (neuralVoice !== "vi-VN-NamMinhNeural") {
            try {
              const retryBuf = await fetchEdgeTTSBuffer(text, "vi-VN-NamMinhNeural", edgeRate);
              res.setHeader("Content-Type", "audio/mpeg");
              res.setHeader("Content-Length", retryBuf.length);
              return res.send(retryBuf);
            } catch {}
          }
          throw edgeErr;
        } else {
          const fallbackBuf = await fetchGoogleTTSBuffer(text, lang);
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Content-Length", fallbackBuf.length);
          res.setHeader("X-TTS-Fallback", "google-natural");
          return res.send(fallbackBuf);
        }
      }
    } catch (err: any) {
      console.error("TTS Stream Error:", err);
      res.status(500).send("Lỗi dịch vụ âm thanh.");
    }
  });

  // Stream Gemini Studio AI TTS audio directly as WAV for real-time playback
  app.get("/api/tts/gemini/stream", async (req, res) => {
    try {
      const rawText = typeof req.query.text === "string" ? req.query.text.trim() : "";
      const voiceName = typeof req.query.voice === "string" ? req.query.voice.trim() : "Kore";
      const rawLang = typeof req.query.lang === "string" ? req.query.lang.trim().toLowerCase() : "vi";
      const lang = rawLang.startsWith("en") ? "en" : "vi";

      if (!rawText) {
        return res.status(400).send("Thiếu nội dung văn bản.");
      }

      // Strip markdown syntax, asterisks, hashtags, symbols
      const text = rawText
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/[*#_~`^\\|<>\[\]{}]+/g, " ")
        .replace(/[•⁃◦▪▫★☆✔✓✦✧■□●○◆◇▲△▼▽🌱🌿🌾🍃✨]/gu, " ")
        .replace(/[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!text) {
        return res.status(400).send("Nội dung rỗng sau khi lọc.");
      }

      const cacheKey = `${voiceName}:${lang}:${text}`;
      if (audioCache.has(cacheKey)) {
        const cachedWav = audioCache.get(cacheKey)!;
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Length", cachedWav.length);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(cachedWav);
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: { "User-Agent": "aistudio-build" },
            },
          });

          // Single speaker voice synthesis with gemini-3.1-flash-tts-preview
          const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: [
              {
                parts: [
                  {
                    text: text.slice(0, 800),
                  },
                ],
              },
            ],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          });

          const audioPart = response.candidates?.[0]?.content?.parts?.[0];
          const base64Audio = audioPart?.inlineData?.data;

          if (base64Audio) {
            const pcmBytes = Buffer.from(base64Audio, "base64");
            const wavBuffer = pcm16ToWavBuffer(pcmBytes, 24000, 1);

            if (audioCache.size > 200) {
              const firstKey = audioCache.keys().next().value;
              if (firstKey) audioCache.delete(firstKey);
            }
            audioCache.set(cacheKey, wavBuffer);

            res.setHeader("Content-Type", "audio/wav");
            res.setHeader("Content-Length", wavBuffer.length);
            res.setHeader("Cache-Control", "public, max-age=86400");
            return res.send(wavBuffer);
          }
        } catch (apiErr: any) {
          console.warn("Gemini TTS live stream failed, falling back to Google Natural TTS:", apiErr?.message);
        }
      }

      // Seamless fallback to Google Natural TTS if Gemini hits rate limit or fails
      try {
        const fallbackBuf = await fetchGoogleTTSBuffer(text, lang);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", fallbackBuf.length);
        res.setHeader("X-TTS-Fallback", "google-natural");
        return res.send(fallbackBuf);
      } catch (fbErr: any) {
        console.error("TTS Fallback failed:", fbErr);
        return res.status(502).send("Không thể tổng hợp giọng đọc.");
      }
    } catch (err: any) {
      console.error("Gemini stream error:", err);
      res.status(500).send("Lỗi xử lý âm thanh.");
    }
  });

  // Gemini TTS endpoint for high-quality AI speech synthesis
  app.post("/api/tts/gemini", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(400).json({
          error: "Chưa cấu hình GEMINI_API_KEY trong hệ thống. Bạn có thể sử dụng chế độ Giọng Đọc Google Tự Nhiên hoàn toàn miễn phí và không giới hạn.",
        });
      }

      const { text: rawText, voiceName = "Kore", lang = "vi" } = req.body;
      if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
        return res.status(400).json({ error: "Thiếu nội dung văn bản cần chuyển đổi." });
      }

      // Strip markdown markers, asterisks, hashes
      const text = rawText
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/[*#_~`^\\|<>\[\]{}]+/g, " ")
        .replace(/[•⁃◦▪▫★☆✔✓✦✧■□●○◆◇▲△▼▽🌱🌿🌾🍃✨]/gu, " ")
        .replace(/[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Single speaker voice config using gemini-3.1-flash-tts-preview
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [
          {
            parts: [
              {
                text: text.slice(0, 2000),
              },
            ],
          },
        ],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.[0];
      const base64Audio = audioPart?.inlineData?.data;
      const mimeType = audioPart?.inlineData?.mimeType || "audio/l16; rate=24000; channels=1";

      if (!base64Audio) {
        return res.status(502).json({
          error: "Không thể trích xuất luồng âm thanh từ mô hình AI.",
        });
      }

      res.json({
        success: true,
        audio: base64Audio,
        mimeType,
      });
    } catch (err: any) {
      console.error("Gemini TTS Error:", err);
      res.status(500).json({
        error: err?.message || "Lỗi xử lý chuyển văn bản thành giọng nói từ AI.",
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
