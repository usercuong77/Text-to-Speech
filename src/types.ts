export type LanguageMode = 'auto' | 'vi' | 'en';

export type TTSEngineType = 'neural-studio' | 'gemini-ai' | 'google-natural' | 'web-speech';

export type VoiceGender = 'all' | 'male' | 'female';

export interface TextChunk {
  id: number;
  paragraphIndex: number;
  sentenceIndex: number;
  rawText: string;
  cleanText: string; // stripped of markdown/emojis for TTS clarity
  charCount: number;
  wordCount: number;
  detectedLang?: 'vi' | 'en';
}

export interface ParagraphBlock {
  id: number;
  originalText: string;
  isHeading?: boolean;
  headingLevel?: number;
  isDivider?: boolean;
  isListItem?: boolean;
  chunks: TextChunk[];
}

export interface TTSVoiceInfo {
  id: string;
  name: string;
  shortName: string;
  gender: 'male' | 'female';
  engine: TTSEngineType;
  lang: string;
  tag: string;
  description: string;
  isVietnamese: boolean;
  isDefault?: boolean;
  nativeVoice?: SpeechSynthesisVoice;
}

export interface PlaybackStatus {
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  currentChunkIndex: number;
  totalChunks: number;
  currentParagraphIndex: number;
  progressPercent: number;
  speed: number;
  volume: number;
}

export interface ReadingStats {
  words: number;
  characters: number;
  sentences: number;
  paragraphs: number;
  estimatedMinutes: number;
}
