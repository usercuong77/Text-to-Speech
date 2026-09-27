import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TextChunk, TTSVoiceInfo, PlaybackStatus, TTSEngineType, LanguageMode, VoiceGender } from '../types';
import { cleanMarkdownForSpeech } from '../utils/textSegmenter';
import { SYSTEM_VOICES, detectVoiceGender } from '../data/voices';

// Helper to reliably apply speed to HTML5 Audio element across all browsers and iframes
function applyAudioSpeed(audio: HTMLAudioElement, targetSpeed: number) {
  try {
    audio.defaultPlaybackRate = targetSpeed;
    audio.playbackRate = targetSpeed;
  } catch (e) {
    console.warn('Could not set playback rate:', e);
  }
}

export function useSpeechPlayer(chunks: TextChunk[]) {
  // TTS Engine: 'neural-studio' | 'gemini-ai' | 'google-natural' | 'web-speech'
  const [engine, setEngine] = useState<TTSEngineType>('neural-studio');
  // Selected Voice ID: defaults to Vietnamese Male Studio Voice (Nam Minh)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('vi-VN-NamMinhNeural');
  // Active Gender Filter/Preference: 'all' | 'male' | 'female'
  const [selectedGender, setSelectedGender] = useState<VoiceGender>('male');
  // Gemini AI voice name fallback/direct setting
  const [geminiVoice, setGeminiVoice] = useState<string>('Fenrir');
  // Language mode: 'auto' | 'vi' | 'en'
  const [languageMode, setLanguageMode] = useState<LanguageMode>('auto');

  // Web Speech Voices loaded from device browser
  const [webSpeechVoices, setWebSpeechVoices] = useState<TTSVoiceInfo[]>([]);

  // Playback parameters
  const [speed, setSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);

  // Playback state
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  // References to keep event handlers and async callbacks synchronized
  const chunksRef = useRef<TextChunk[]>(chunks);
  const currentIndexRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const engineRef = useRef<TTSEngineType>(engine);
  const selectedVoiceIdRef = useRef<string>(selectedVoiceId);
  const selectedGenderRef = useRef<VoiceGender>(selectedGender);
  const geminiVoiceRef = useRef<string>(geminiVoice);
  const languageModeRef = useRef<LanguageMode>(languageMode);
  const speedRef = useRef<number>(speed);
  const volumeRef = useRef<number>(volume);

  // Audio elements for server audio stream playback
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioUrlRef = useRef<string | null>(null);

  // Web Speech timer
  const keepAliveIntervalRef = useRef<number | null>(null);

  // Synchronize refs
  useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);

  useEffect(() => {
    currentIndexRef.current = currentChunkIndex;
  }, [currentChunkIndex]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useEffect(() => {
    selectedVoiceIdRef.current = selectedVoiceId;
  }, [selectedVoiceId]);

  useEffect(() => {
    selectedGenderRef.current = selectedGender;
  }, [selectedGender]);

  useEffect(() => {
    geminiVoiceRef.current = geminiVoice;
  }, [geminiVoice]);

  useEffect(() => {
    languageModeRef.current = languageMode;
  }, [languageMode]);

  useEffect(() => {
    volumeRef.current = volume;
    if (currentAudioRef.current) {
      currentAudioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle speed changes with immediate live enforcement
  const changeSpeed = useCallback((newSpeed: number) => {
    const boundedSpeed = Math.max(0.5, Math.min(2.0, Math.round(newSpeed * 100) / 100));
    setSpeed(boundedSpeed);
    speedRef.current = boundedSpeed;

    if (currentAudioRef.current) {
      applyAudioSpeed(currentAudioRef.current, boundedSpeed);
    }
    if (nextAudioRef.current) {
      applyAudioSpeed(nextAudioRef.current, boundedSpeed);
    }
  }, []);

  // Load and classify Web Speech voices with gender detection
  const populateWebSpeechVoices = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    const rawVoices = window.speechSynthesis.getVoices();
    if (!rawVoices || rawVoices.length === 0) return;

    const formatted: TTSVoiceInfo[] = rawVoices.map((v) => {
      const isVi =
        v.lang.toLowerCase().startsWith('vi') ||
        v.name.toLowerCase().includes('vietnam') ||
        v.name.toLowerCase().includes('tiếng việt') ||
        v.name.toLowerCase().includes('hoaimy') ||
        v.name.toLowerCase().includes('nam') ||
        v.name.toLowerCase().includes('linh');

      const gender = detectVoiceGender(v.name);

      return {
        id: `web_${v.name}_${v.lang}`,
        name: `${v.name} (${gender === 'male' ? 'Nam' : 'Nữ'} - Máy)`,
        shortName: `${v.name.slice(0, 15)} (${gender === 'male' ? 'Nam' : 'Nữ'})`,
        gender,
        engine: 'web-speech' as TTSEngineType,
        lang: v.lang,
        tag: 'Trình duyệt',
        description: `Giọng đọc hệ điều hành (${v.lang})`,
        isVietnamese: isVi,
        isDefault: v.default,
        nativeVoice: v,
      };
    });

    formatted.sort((a, b) => {
      if (a.isVietnamese && !b.isVietnamese) return -1;
      if (!a.isVietnamese && b.isVietnamese) return 1;
      return a.name.localeCompare(b.name);
    });

    setWebSpeechVoices(formatted);
  }, []);

  useEffect(() => {
    populateWebSpeechVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = populateWebSpeechVoices;
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [populateWebSpeechVoices]);

  // Combined voice list (Curated System Studio Voices + Local Web Speech Voices)
  const allVoices = useMemo(() => {
    return [...SYSTEM_VOICES, ...webSpeechVoices];
  }, [webSpeechVoices]);

  // Filtered voice list according to active gender ('all' | 'male' | 'female')
  const filteredVoices = useMemo(() => {
    if (selectedGender === 'all') return allVoices;
    return allVoices.filter((v) => v.gender === selectedGender);
  }, [allVoices, selectedGender]);

  // Current active voice object
  const currentVoice = useMemo(() => {
    return (
      allVoices.find((v) => v.id === selectedVoiceId) ||
      allVoices.find((v) => v.gender === selectedGender) ||
      SYSTEM_VOICES[0]
    );
  }, [allVoices, selectedVoiceId, selectedGender]);

  // Helper to resolve effective language code ('vi' or 'en') for a chunk
  const resolveChunkLang = useCallback((chunk: TextChunk): 'vi' | 'en' => {
    const mode = languageModeRef.current;
    if (mode === 'vi') return 'vi';
    if (mode === 'en') return 'en';
    return chunk.detectedLang || 'vi';
  }, []);

  // Web Speech keepalive
  const startKeepAlive = () => {
    stopKeepAlive();
    keepAliveIntervalRef.current = window.setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 8000);
  };

  const stopKeepAlive = () => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  };

  // Stop any currently playing audio from any engine
  const stopAllEngines = useCallback(() => {
    // 1. Stop HTML5 Audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.removeAttribute('src');
      currentAudioRef.current.load();
      currentAudioRef.current = null;
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.removeAttribute('src');
      nextAudioRef.current.load();
      nextAudioRef.current = null;
      nextAudioUrlRef.current = null;
    }

    // 2. Stop Web Speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    stopKeepAlive();
  }, []);

  // Construct stream URL for server audio engines (speed handled client-side via playbackRate for zero latency)
  const buildStreamUrl = useCallback(
    (textToSpeak: string, chunkLang: 'vi' | 'en') => {
      const activeVoiceId = selectedVoiceIdRef.current || 'vi-VN-NamMinhNeural';
      const activeGender = selectedGenderRef.current;
      return `/api/tts/stream?text=${encodeURIComponent(textToSpeak)}&voice=${encodeURIComponent(
        activeVoiceId
      )}&gender=${activeGender}&lang=${chunkLang}`;
    },
    []
  );

  // Pre-buffer next chunk for seamless uninterrupted speech
  const prefetchNextChunk = useCallback(
    (nextIndex: number) => {
      const activeChunks = chunksRef.current;
      if (nextIndex < 0 || nextIndex >= activeChunks.length) return;

      const nextChunk = activeChunks[nextIndex];
      const lang = resolveChunkLang(nextChunk);
      const textToSpeak = cleanMarkdownForSpeech(nextChunk.cleanText || nextChunk.rawText);
      if (!textToSpeak.trim()) return;

      if (engineRef.current === 'web-speech') return;

      const url = buildStreamUrl(textToSpeak, lang);

      // Pre-warm server cache in parallel so next chunk is already ready
      fetch(url).catch(() => {});

      const audio = new Audio();
      audio.preload = 'auto';
      applyAudioSpeed(audio, speedRef.current);
      audio.src = url;
      try {
        audio.load();
      } catch {}
      nextAudioRef.current = audio;
      nextAudioUrlRef.current = url;
    },
    [buildStreamUrl, resolveChunkLang]
  );

  // Play chunk via Server Audio Stream (Studio Neural, Gemini AI, Google Natural)
  const playChunkServerAudio = useCallback(
    (index: number) => {
      const activeChunks = chunksRef.current;
      if (index < 0 || index >= activeChunks.length) {
        setIsPlaying(false);
        setIsPaused(false);
        setIsBuffering(false);
        setCurrentChunkIndex(0);
        return;
      }

      const chunk = activeChunks[index];
      const textToSpeak = cleanMarkdownForSpeech(chunk.cleanText || chunk.rawText);
      if (!textToSpeak.trim()) {
        playChunkServerAudio(index + 1);
        return;
      }

      const lang = resolveChunkLang(chunk);
      const streamUrl = buildStreamUrl(textToSpeak, lang);

      // Check if prebuffered audio matches exactly
      let audio: HTMLAudioElement;
      if (nextAudioRef.current && nextAudioUrlRef.current === streamUrl) {
        audio = nextAudioRef.current;
        nextAudioRef.current = null;
        nextAudioUrlRef.current = null;
      } else {
        audio = new Audio(streamUrl);
      }

      currentAudioRef.current = audio;

      // Apply audio playbackRate & volume reliably
      applyAudioSpeed(audio, speedRef.current);
      audio.volume = volumeRef.current;

      // Re-apply rate on media decoding events to prevent browser reset to 1.0
      const enforceSpeed = () => applyAudioSpeed(audio, speedRef.current);
      audio.addEventListener('loadedmetadata', enforceSpeed);
      audio.addEventListener('canplay', enforceSpeed);
      audio.addEventListener('play', enforceSpeed);
      audio.addEventListener('playing', enforceSpeed);

      setIsBuffering(true);
      setCurrentChunkIndex(index);

      // Prefetch next chunk immediately so it buffers while this chunk starts
      prefetchNextChunk(index + 1);

      audio.onplay = () => {
        applyAudioSpeed(audio, speedRef.current);
        setIsPlaying(true);
        setIsPaused(false);
        setIsBuffering(false);
        prefetchNextChunk(index + 1);
      };

      audio.onended = () => {
        if (isPlayingRef.current && !isPausedRef.current) {
          const nextIdx = index + 1;
          if (nextIdx < chunksRef.current.length) {
            playChunkServerAudio(nextIdx);
          } else {
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentChunkIndex(0);
          }
        }
      };

      audio.onerror = (e) => {
        console.warn('Server audio stream error:', e);
        setIsBuffering(false);
        if (isPlayingRef.current && !isPausedRef.current) {
          const nextIdx = index + 1;
          if (nextIdx < chunksRef.current.length) {
            setTimeout(() => playChunkServerAudio(nextIdx), 200);
          } else {
            setIsPlaying(false);
            setIsPaused(false);
          }
        }
      };

      audio.play().catch((err) => {
        console.warn('Audio play request waiting for user gesture:', err);
        setIsBuffering(false);
      });
    },
    [buildStreamUrl, prefetchNextChunk, resolveChunkLang]
  );

  // Play chunk via Web Speech Synthesis (System voices)
  const playChunkWebSpeech = useCallback(
    (index: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      const activeChunks = chunksRef.current;
      if (index < 0 || index >= activeChunks.length) {
        stopKeepAlive();
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentChunkIndex(0);
        return;
      }

      window.speechSynthesis.cancel();

      const chunk = activeChunks[index];
      const textToSpeak = cleanMarkdownForSpeech(chunk.cleanText || chunk.rawText);
      if (!textToSpeak.trim()) {
        playChunkWebSpeech(index + 1);
        return;
      }

      const lang = resolveChunkLang(chunk);
      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // Match voice
      const selected = allVoices.find((v) => v.id === selectedVoiceIdRef.current);
      if (selected && selected.nativeVoice) {
        utterance.voice = selected.nativeVoice;
        utterance.lang = selected.nativeVoice.lang;
      } else {
        utterance.lang = lang === 'en' ? 'en-US' : 'vi-VN';
      }

      utterance.rate = speedRef.current;
      utterance.volume = volumeRef.current;

      utterance.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
        setCurrentChunkIndex(index);
        startKeepAlive();
      };

      utterance.onend = () => {
        if (isPlayingRef.current && !isPausedRef.current) {
          const nextIdx = index + 1;
          if (nextIdx < chunksRef.current.length) {
            playChunkWebSpeech(nextIdx);
          } else {
            stopKeepAlive();
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentChunkIndex(0);
          }
        }
      };

      utterance.onerror = (event) => {
        console.warn('Speech synthesis error:', event);
        if (isPlayingRef.current && !isPausedRef.current) {
          const nextIdx = index + 1;
          if (nextIdx < chunksRef.current.length) {
            setTimeout(() => playChunkWebSpeech(nextIdx), 150);
          } else {
            stopKeepAlive();
            setIsPlaying(false);
            setIsPaused(false);
          }
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [allVoices, resolveChunkLang]
  );

  // Dispatch playChunk according to selected engine
  const playChunk = useCallback(
    (index: number) => {
      stopAllEngines();

      if (engineRef.current === 'web-speech') {
        playChunkWebSpeech(index);
      } else {
        playChunkServerAudio(index);
      }
    },
    [stopAllEngines, playChunkServerAudio, playChunkWebSpeech]
  );

  // User playback actions
  const play = useCallback(() => {
    if (chunks.length === 0) return;

    if (isPaused) {
      if (engineRef.current !== 'web-speech' && currentAudioRef.current) {
        currentAudioRef.current.play();
        setIsPaused(false);
        setIsPlaying(true);
        return;
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
        setIsPlaying(true);
        startKeepAlive();
        return;
      }
    }

    setIsPlaying(true);
    setIsPaused(false);
    playChunk(currentChunkIndex);
  }, [chunks.length, isPaused, currentChunkIndex, playChunk]);

  const pause = useCallback(() => {
    if (engineRef.current !== 'web-speech' && currentAudioRef.current) {
      currentAudioRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
      stopKeepAlive();
    }
  }, []);

  const resume = useCallback(() => {
    if (engineRef.current !== 'web-speech' && currentAudioRef.current) {
      currentAudioRef.current.play();
      setIsPaused(false);
      setIsPlaying(true);
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        playChunk(currentChunkIndex);
      }
      setIsPaused(false);
      setIsPlaying(true);
      startKeepAlive();
    } else {
      playChunk(currentChunkIndex);
    }
  }, [currentChunkIndex, playChunk]);

  const stop = useCallback(() => {
    stopAllEngines();
    setIsPlaying(false);
    setIsPaused(false);
    setIsBuffering(false);
    setCurrentChunkIndex(0);
  }, [stopAllEngines]);

  const jumpToChunk = useCallback(
    (index: number) => {
      const boundedIndex = Math.max(0, Math.min(index, chunks.length - 1));
      setCurrentChunkIndex(boundedIndex);
      if (isPlayingRef.current) {
        playChunk(boundedIndex);
      }
    },
    [chunks.length, playChunk]
  );

  const nextChunk = useCallback(() => {
    jumpToChunk(currentChunkIndex + 1);
  }, [currentChunkIndex, jumpToChunk]);

  const prevChunk = useCallback(() => {
    jumpToChunk(Math.max(0, currentChunkIndex - 1));
  }, [currentChunkIndex, jumpToChunk]);

  // Change active voice with auto-engine and auto-gender alignment
  const selectVoice = useCallback(
    (voiceId: string) => {
      const foundVoice = allVoices.find((v) => v.id === voiceId);
      if (!foundVoice) return;

      const wasPlaying = isPlayingRef.current;
      stopAllEngines();

      setSelectedVoiceId(voiceId);
      selectedVoiceIdRef.current = voiceId;

      setSelectedGender(foundVoice.gender);
      selectedGenderRef.current = foundVoice.gender;

      setEngine(foundVoice.engine);
      engineRef.current = foundVoice.engine;

      if (foundVoice.id.startsWith('gemini-')) {
        const geminiName = foundVoice.id.replace('gemini-', '');
        setGeminiVoice(geminiName);
        geminiVoiceRef.current = geminiName;
      }

      if (wasPlaying) {
        setTimeout(() => playChunk(currentIndexRef.current), 100);
      }
    },
    [allVoices, stopAllEngines, playChunk]
  );

  // Quick Switch Gender: 'male' | 'female' | 'all'
  const setGender = useCallback(
    (gender: VoiceGender) => {
      const wasPlaying = isPlayingRef.current;
      stopAllEngines();

      setSelectedGender(gender);
      selectedGenderRef.current = gender;

      if (gender === 'male') {
        setSelectedVoiceId('vi-VN-NamMinhNeural');
        selectedVoiceIdRef.current = 'vi-VN-NamMinhNeural';
        setEngine('neural-studio');
        engineRef.current = 'neural-studio';
      } else if (gender === 'female') {
        setSelectedVoiceId('vi-VN-HoaiMyNeural');
        selectedVoiceIdRef.current = 'vi-VN-HoaiMyNeural';
        setEngine('neural-studio');
        engineRef.current = 'neural-studio';
      }

      if (wasPlaying) {
        setTimeout(() => playChunk(currentIndexRef.current), 100);
      }
    },
    [stopAllEngines, playChunk]
  );

  // Change engine explicitly
  const changeEngine = useCallback(
    (newEngine: TTSEngineType) => {
      const wasPlaying = isPlayingRef.current;
      stopAllEngines();
      setEngine(newEngine);
      engineRef.current = newEngine;

      // Select suitable default voice for this engine matching current gender
      const matchingVoice =
        allVoices.find((v) => v.engine === newEngine && v.gender === selectedGenderRef.current) ||
        allVoices.find((v) => v.engine === newEngine);

      if (matchingVoice) {
        setSelectedVoiceId(matchingVoice.id);
        selectedVoiceIdRef.current = matchingVoice.id;
      }

      if (wasPlaying) {
        setTimeout(() => playChunk(currentIndexRef.current), 100);
      }
    },
    [allVoices, stopAllEngines, playChunk]
  );

  // Handle Gemini Studio AI Voice change
  const changeGeminiVoice = useCallback(
    (newVoice: string) => {
      const targetId = `gemini-${newVoice}`;
      selectVoice(targetId);
    },
    [selectVoice]
  );

  // Handle language mode change
  const changeLanguageMode = useCallback(
    (newMode: LanguageMode) => {
      const wasPlaying = isPlayingRef.current;
      setLanguageMode(newMode);
      languageModeRef.current = newMode;
      if (wasPlaying) {
        stopAllEngines();
        setTimeout(() => playChunk(currentIndexRef.current), 100);
      }
    },
    [stopAllEngines, playChunk]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllEngines();
    };
  }, [stopAllEngines]);

  const progressPercent =
    chunks.length > 0
      ? Math.round(((currentChunkIndex + (isPlaying ? 0.5 : 0)) / chunks.length) * 100)
      : 0;

  const playbackStatus: PlaybackStatus = {
    isPlaying,
    isPaused,
    isBuffering,
    currentChunkIndex,
    totalChunks: chunks.length,
    currentParagraphIndex: chunks[currentChunkIndex]?.paragraphIndex ?? 0,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    speed,
    volume,
  };

  return {
    engine,
    setEngine: changeEngine,
    geminiVoice,
    setGeminiVoice: changeGeminiVoice,
    languageMode,
    setLanguageMode: changeLanguageMode,
    voices: allVoices,
    filteredVoices,
    selectedVoiceId,
    selectedVoice: currentVoice,
    setSelectedVoiceId: selectVoice,
    selectedGender,
    setGender,
    speed,
    setSpeed: changeSpeed,
    volume,
    setVolume,
    playbackStatus,
    autoScroll,
    setAutoScroll,
    play,
    pause,
    resume,
    stop,
    jumpToChunk,
    nextChunk,
    prevChunk,
    resolveChunkLang,
  };
}
