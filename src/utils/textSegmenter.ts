import { ParagraphBlock, ReadingStats, TextChunk } from '../types';

/**
 * Cleans markdown formatting, symbols, and artifacts so speech synthesis pronounces
 * Vietnamese and English text naturally and smoothly without reading asterisks ("sao sao"),
 * hashes ("thăng"), dashes, or markup syntax out loud.
 */
export function cleanMarkdownForSpeech(text: string): string {
  if (!text) return '';

  let cleaned = text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown headers (#, ##, ###)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown links [title](url) to title, and raw URLs
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/gi, '')
    // Remove paired bold and italic markers (**bold**, *italic*, __bold__, _italic_)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove strikethrough (~~del~~)
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove horizontal rules
    .replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '')
    // Remove list markers (*, -, +, 1.) at start of lines
    .replace(/^[ \t]*[-*+]\s+/gm, '')
    .replace(/^[ \t]*\d+\.\s+/gm, '')
    // Remove blockquotes
    .replace(/^[ \t]*>\s*/gm, '')
    // Replace em-dash / en-dash with comma or pause
    .replace(/[—–]/g, ', ')
    // CRITICAL: Strip ALL remaining asterisks (*, **), hashes (#), underscores (_), tildes (~),
    // backticks, brackets, pipes, carets, slashes that Google TTS reads out loud as "sao sao" or symbols
    .replace(/[*#_~`^\\|<>\[\]{}]+/g, ' ')
    // Remove decorative bullet points and geometric symbols
    .replace(/[•⁃◦▪▫★☆✔✓✦✧■□●○◆◇▲△▼▽🌱🌿🌾🍃✨]/gu, ' ')
    // Remove all non-verbal emojis and symbols
    .replace(/[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/gu, ' ')
    // Strip quotation marks so TTS does not pronounce "dấu ngoặc kép"
    .replace(/[""«»]/g, ' ')
    .replace(/['']/g, "'")
    // Replace isolated hyphens between words with comma pause
    .replace(/\s+-\s+/g, ', ')
    // Clean multiple commas or punctuation
    .replace(/,+/g, ', ')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Detects whether a string is primarily Vietnamese or English
 */
export function detectLanguage(text: string): 'vi' | 'en' {
  if (!text) return 'vi';

  // Vietnamese distinct characters and diacritics
  const vietnameseDiacritics = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  if (vietnameseDiacritics.test(text)) {
    return 'vi';
  }

  // Count common English words
  const englishWords = /\b(the|and|is|are|was|were|you|that|this|with|for|from|have|has|not|but|what|all|when|your|can|said|will|there)\b/i;
  if (englishWords.test(text)) {
    return 'en';
  }

  return 'vi';
}

/**
 * Splits a paragraph string into natural sentences / spoken chunks.
 * Accurately respects Vietnamese & English punctuation (. ? ! ; \n).
 * Protects decimal numbers (10.5) and abbreviations (TP.HCM, v.v., Mr., Dr.) from being broken.
 * Never chops sentences mid-phrase or before reaching real punctuation.
 */
export function splitParagraphIntoSentences(paragraphText: string): string[] {
  const trimmed = paragraphText.trim();
  if (!trimmed) return [];

  // Ignore markdown horizontal dividers
  if (/^[-*_]{3,}$/.test(trimmed)) {
    return [];
  }

  // 1. Protect abbreviations and decimal numbers from splitting
  const protectedText = trimmed
    .replace(/(\d+)\.(\d+)/g, '$1___DOT___$2')
    .replace(
      /\b(TP|Th\.S|TS|BS|GS|PGS|v\.v|e\.g|i\.e|Mr|Mrs|Ms|Dr|Prof|approx|vs)\./gi,
      (m) => m.replace(/\./g, '___DOT___')
    );

  // 2. Split on true sentence boundaries:
  // - Terminal punctuation: . ? ! followed by space, quotes, or line-end
  // - Semicolon ; followed by space or line-end
  // - Colon : ONLY when at the end of a header / line (followed by \n or end of text)
  // - Newlines (\n)
  const regex = /([^.?!;\n]+(?:[.?!;]+["”\)]*|\:(?=\s*\n|$)|(?=\n)|$))/g;
  const matches = protectedText.match(regex) || [protectedText];

  const sentences: string[] = [];
  let buffer = '';

  for (let part of matches) {
    // Restore protected dots
    part = part.replace(/___DOT___/g, '.').trim();
    if (!part) continue;

    // Check if part is just a list numbering prefix like "1." or "2)" or "a."
    const isListPrefix = /^(\d+[\.\)]|[a-zA-Z][\.\)])\s*$/.test(part);
    const candidate = buffer ? buffer + ' ' + part : part;

    // If candidate is just a list prefix or too short without ending punctuation, merge with next
    if (isListPrefix || (candidate.length < 12 && !/[.?!]/.test(candidate) && matches.length > 1)) {
      buffer = candidate;
    } else {
      if (candidate.trim()) {
        sentences.push(candidate.trim());
      }
      buffer = '';
    }
  }

  if (buffer.trim()) {
    if (sentences.length > 0) {
      sentences[sentences.length - 1] += ' ' + buffer.trim();
    } else {
      sentences.push(buffer.trim());
    }
  }

  return sentences.filter((s) => s.trim().length > 0);
}

/**
 * Takes full unlimited text and breaks it into structured paragraph blocks and sequential chunks.
 */
export function segmentText(fullText: string): {
  blocks: ParagraphBlock[];
  chunks: TextChunk[];
  stats: ReadingStats;
} {
  const rawParagraphs = fullText.split(/\n+/);
  const blocks: ParagraphBlock[] = [];
  const chunks: TextChunk[] = [];

  let globalChunkId = 0;

  rawParagraphs.forEach((rawPara, pIndex) => {
    const trimmed = rawPara.trim();
    if (!trimmed) return;

    const isDivider = /^[-*_]{3,}$/.test(trimmed);
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
    const isHeading = !!headingMatch;
    const headingLevel = headingMatch ? headingMatch[1].length : undefined;
    const isListItem = /^[ \t]*[-*+]\s+/.test(trimmed) || /^[ \t]*\d+\.\s+/.test(trimmed);

    const sentences = splitParagraphIntoSentences(trimmed);
    const blockChunks: TextChunk[] = [];

    sentences.forEach((sentence, sIndex) => {
      const clean = cleanMarkdownForSpeech(sentence);
      if (!clean) return;

      const words = clean.split(/\s+/).filter(Boolean).length;
      const detectedLang = detectLanguage(clean);
      const chunk: TextChunk = {
        id: globalChunkId++,
        paragraphIndex: pIndex,
        sentenceIndex: sIndex,
        rawText: sentence,
        cleanText: clean,
        charCount: clean.length,
        wordCount: words,
        detectedLang,
      };

      blockChunks.push(chunk);
      chunks.push(chunk);
    });

    blocks.push({
      id: pIndex,
      originalText: trimmed,
      isHeading,
      headingLevel,
      isDivider,
      isListItem,
      chunks: blockChunks,
    });
  });

  // Calculate statistics
  const totalWords = chunks.reduce((acc, c) => acc + c.wordCount, 0);
  const totalChars = fullText.length;
  const totalSentences = chunks.length;
  const totalParagraphs = blocks.length;
  // Average Vietnamese reading speed is ~160 words per minute
  const estimatedMinutes = Math.max(1, Math.round(totalWords / 160));

  return {
    blocks,
    chunks,
    stats: {
      words: totalWords,
      characters: totalChars,
      sentences: totalSentences,
      paragraphs: totalParagraphs,
      estimatedMinutes,
    },
  };
}
