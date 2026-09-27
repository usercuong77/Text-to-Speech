import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Globe,
  Radio,
  Loader2,
  User,
  Users,
  Gauge,
  Plus,
  Minus,
} from 'lucide-react';
import { PlaybackStatus, TTSVoiceInfo, TextChunk, TTSEngineType, LanguageMode, VoiceGender } from '../types';

interface PlayerControlsProps {
  playbackStatus: PlaybackStatus;
  currentChunk?: TextChunk;
  engine: TTSEngineType;
  onEngineChange: (engine: TTSEngineType) => void;
  geminiVoice?: string;
  onGeminiVoiceChange?: (voice: string) => void;
  languageMode: LanguageMode;
  onLanguageModeChange: (mode: LanguageMode) => void;
  currentChunkLang?: 'vi' | 'en';
  voices: TTSVoiceInfo[];
  selectedVoiceId: string;
  onSelectVoice: (id: string) => void;
  selectedGender?: VoiceGender;
  onGenderChange?: (gender: VoiceGender) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (index: number) => void;
  onOpenExportModal: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  playbackStatus,
  currentChunk,
  engine,
  onEngineChange,
  geminiVoice = 'Fenrir',
  onGeminiVoiceChange,
  languageMode,
  onLanguageModeChange,
  currentChunkLang,
  voices,
  selectedVoiceId,
  onSelectVoice,
  selectedGender = 'male',
  onGenderChange,
  speed,
  onSpeedChange,
  volume,
  onVolumeChange,
  autoScroll,
  onToggleAutoScroll,
  onPlay,
  onPause,
  onResume,
  onStop,
  onPrev,
  onNext,
  onSeek,
  onOpenExportModal,
}) => {
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);

  const { isPlaying, isPaused, isBuffering, currentChunkIndex, totalChunks, progressPercent } =
    playbackStatus;

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(prevVolume || 1);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  const effectiveLang = currentChunkLang || currentChunk?.detectedLang || 'vi';

  // Find active voice details
  const activeVoice = voices.find((v) => v.id === selectedVoiceId) || voices[0];

  // Group voices for intuitive selection
  const studioVoices = voices.filter((v) => v.engine === 'neural-studio');
  const geminiVoices = voices.filter((v) => v.engine === 'gemini-ai');
  const googleVoices = voices.filter((v) => v.engine === 'google-natural');
  const webVoices = voices.filter((v) => v.engine === 'web-speech');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 shadow-xl transition-colors">
      {/* Expanded Fine-tuning Panel (Collapsible) */}
      {showSettingsDrawer && (
        <div className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 py-4 sm:px-8 transition-colors">
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-neutral-700 dark:text-neutral-300">
            {/* Speed slider & Quick Presets */}
            <div>
              <div className="flex justify-between font-medium mb-1.5">
                <span>Tốc độ đọc: <strong className="text-amber-700 dark:text-amber-400">{speed % 1 === 0 ? `${speed}.0` : speed}x</strong></span>
                <span className="text-neutral-500 dark:text-neutral-400">Chuẩn: 1.0x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={speed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg"
              />
              <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-2">
                <span>0.5x (Chậm)</span>
                <button
                  type="button"
                  id="btn-reset-speed-drawer"
                  onClick={() => onSpeedChange(1.0)}
                  className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium cursor-pointer transition-colors"
                >
                  Đặt lại 1.0x
                </button>
                <span>2.0x (Nhanh)</span>
              </div>
            </div>

            {/* Volume slider & Auto Scroll toggle */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex justify-between font-medium mb-1.5">
                  <span>Âm lượng: {Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    onVolumeChange(parseFloat(e.target.value));
                    if (isMuted && parseFloat(e.target.value) > 0) setIsMuted(false);
                  }}
                  className="w-full accent-amber-600 cursor-pointer h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">Ngôn ngữ đọc:</span>
                  <select
                    id="select-language-mode-drawer"
                    value={languageMode}
                    onChange={(e) => onLanguageModeChange(e.target.value as LanguageMode)}
                    className="text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1 text-neutral-800 dark:text-neutral-200 font-medium"
                  >
                    <option value="auto">🌐 Tự động (VI & EN)</option>
                    <option value="vi">🇻🇳 Tiếng Việt</option>
                    <option value="en">🇺🇸 English</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={onToggleAutoScroll}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800"
                  />
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">Tự động cuộn theo câu đang đọc</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Progress Seek Bar across top of player */}
      <div
        className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 cursor-pointer group relative overflow-hidden"
        onClick={(e) => {
          if (totalChunks <= 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const fraction = Math.max(0, Math.min(1, clickX / rect.width));
          const targetIndex = Math.floor(fraction * totalChunks);
          onSeek(targetIndex);
        }}
        title="Nhấp vào để tua tới câu bất kỳ"
      >
        <div
          className="h-full bg-amber-500 transition-all duration-200 group-hover:bg-amber-600 relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-700 opacity-0 group-hover:opacity-100 shadow-sm transition-opacity" />
        </div>
      </div>

      {/* Main Controls Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
        {/* Responsive Desktop (lg+) & Mobile (<lg) Layout to completely prevent overlapping */}
        
        {/* === Mobile / Tablet Layout (< lg) === */}
        <div className="flex lg:hidden flex-col gap-2">
          {/* Mobile Top Row: Sentence preview + Waveform + Quick Voice & Audio Actions */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            {/* Sentence Preview + Waveform */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex items-center justify-center h-6 px-1.5 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 shrink-0">
                {isBuffering ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                ) : (
                  <div className="flex items-center gap-0.5">
                    <div className={`w-0.5 bg-amber-500 rounded-full transition-all duration-200 ${isPlaying ? 'h-3.5 animate-pulse' : 'h-1.5'}`} />
                    <div className={`w-0.5 bg-amber-500 rounded-full transition-all duration-300 ${isPlaying ? 'h-2 animate-pulse' : 'h-1'}`} />
                    <div className={`w-0.5 bg-amber-500 rounded-full transition-all duration-150 ${isPlaying ? 'h-4 animate-pulse' : 'h-2'}`} />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-800/80 shrink-0">
                    Câu {totalChunks > 0 ? currentChunkIndex + 1 : 0}/{totalChunks}
                  </span>
                  {activeVoice && (
                    <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 truncate max-w-[90px] sm:max-w-[140px]">
                      {activeVoice.shortName}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate italic">
                  {currentChunk ? `"${currentChunk.rawText}"` : 'Sẵn sàng đọc'}
                </p>
              </div>
            </div>

            {/* Mobile Top Right: Voice Selector & Settings Toggle */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Compact Voice Select */}
              <div className="relative max-w-[130px] sm:max-w-[180px]">
                <select
                  id="select-active-voice-mobile"
                  value={selectedVoiceId}
                  onChange={(e) => onSelectVoice(e.target.value)}
                  className="w-full text-[11px] bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1 text-neutral-900 dark:text-neutral-100 truncate cursor-pointer font-medium"
                  title="Chọn giọng đọc"
                >
                  <optgroup label="🌟 Giọng Studio Cao Cấp">
                    {studioVoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.gender === 'male' ? '👨' : '👩'} {v.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="✨ Giọng Gemini AI">
                    {geminiVoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.gender === 'male' ? '👨' : '👩'} {v.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="⚡ Giọng Tiêu Chuẩn Google">
                    {googleVoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.gender === 'male' ? '👨' : '👩'} {v.name}
                      </option>
                    ))}
                  </optgroup>
                  {webVoices.length > 0 && (
                    <optgroup label="💻 Giọng Hệ Điều Hành">
                      {webVoices.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Mute button */}
              <button
                type="button"
                id="btn-toggle-mute-mobile"
                onClick={handleToggleMute}
                className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              {/* Settings drawer toggle */}
              <button
                type="button"
                id="btn-toggle-settings-mobile"
                onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showSettingsDrawer
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title="Cài đặt chi tiết"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Bottom Row: Playback Buttons + External Speed Controls (Zero overlap) */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/60">
            {/* Playback Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="btn-prev-chunk-mobile"
                onClick={onPrev}
                disabled={currentChunkIndex <= 0 || totalChunks === 0}
                className="p-1.5 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors"
                title="Lùi một câu"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="btn-stop-playback-mobile"
                onClick={onStop}
                disabled={!isPlaying && !isPaused}
                className="p-1.5 rounded-full text-neutral-600 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-30 transition-colors"
                title="Dừng hẳn"
              >
                <Square className="w-4 h-4" />
              </button>

              {isPlaying ? (
                <button
                  type="button"
                  id="btn-pause-playback-mobile"
                  onClick={onPause}
                  className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
                  title="Tạm dừng"
                >
                  <Pause className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-play-playback-mobile"
                  onClick={isPaused ? onResume : onPlay}
                  disabled={totalChunks === 0}
                  className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
                  title={isPaused ? 'Tiếp tục' : 'Phát'}
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              )}

              <button
                type="button"
                id="btn-next-chunk-mobile"
                onClick={onNext}
                disabled={currentChunkIndex >= totalChunks - 1 || totalChunks === 0}
                className="p-1.5 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors"
                title="Tiến một câu"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* External Speed Controls (Steppers - / + only, No presets) */}
            <div
              className="flex items-center bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700/80 gap-1.5 shrink-0"
              title="Tốc độ đọc (nhấn - hoặc + để chỉnh)"
            >
              <button
                type="button"
                id="btn-speed-decrease-mobile"
                onClick={() => onSpeedChange(Math.max(0.5, parseFloat((speed - 0.1).toFixed(2))))}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 active:scale-95 font-bold shadow-2xs transition-colors cursor-pointer"
                title="Giảm tốc độ (-0.1x)"
                aria-label="Giảm tốc độ"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                id="btn-speed-reset-mobile"
                onClick={() => onSpeedChange(1.0)}
                className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 min-w-[34px] text-center select-none cursor-pointer py-0.5 px-1 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors"
                title="Bấm để đặt lại về 1.0x"
              >
                {speed.toFixed(1)}x
              </button>

              <button
                type="button"
                id="btn-speed-increase-mobile"
                onClick={() => onSpeedChange(Math.min(2.0, parseFloat((speed + 0.1).toFixed(2))))}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 active:scale-95 font-bold shadow-2xs transition-colors cursor-pointer"
                title="Tăng tốc độ (+0.1x)"
                aria-label="Tăng tốc độ"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* === Desktop Layout (lg+) === */}
        {/* Clean 3-column layout with explicit bounds to ensure NO button ever overlaps */}
        <div className="hidden lg:flex items-center justify-between gap-4">
          {/* Left Column: Waveform + Sentence Preview (max width constrained, never encroaches center) */}
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xs xl:max-w-sm">
            <div className="flex items-center justify-center h-8 px-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shrink-0">
              {isBuffering ? (
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
              ) : (
                <div className="flex items-center gap-1">
                  <div className={`w-1 bg-amber-500 rounded-full transition-all duration-200 ${isPlaying ? 'h-4 animate-pulse' : 'h-1.5'}`} />
                  <div className={`w-1 bg-amber-500 rounded-full transition-all duration-300 ${isPlaying ? 'h-2.5 animate-pulse' : 'h-1'}`} />
                  <div className={`w-1 bg-amber-500 rounded-full transition-all duration-150 ${isPlaying ? 'h-5 animate-pulse' : 'h-2.5'}`} />
                  <div className={`w-1 bg-amber-500 rounded-full transition-all duration-250 ${isPlaying ? 'h-3 animate-pulse' : 'h-1.5'}`} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/80 shrink-0">
                  Câu {totalChunks > 0 ? currentChunkIndex + 1 : 0} / {totalChunks}
                </span>

                {activeVoice && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-1 truncate max-w-[130px] ${
                      activeVoice.gender === 'male'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/80'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/80'
                    }`}
                    title={activeVoice.description}
                  >
                    <span>{activeVoice.gender === 'male' ? '👨' : '👩'}</span>
                    <span className="truncate">{activeVoice.shortName}</span>
                  </span>
                )}

                {/* Language Mode Indicator */}
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
                    effectiveLang === 'vi'
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
                  }`}
                  title={`Ngôn ngữ đọc: ${effectiveLang === 'vi' ? 'Tiếng Việt' : 'English'}`}
                >
                  {effectiveLang === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
                </span>

                <span className="text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0">
                  {progressPercent}%
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate mt-0.5 italic">
                {currentChunk ? `"${currentChunk.rawText}"` : 'Sẵn sàng đọc văn bản'}
              </p>
            </div>
          </div>

          {/* Center Column: Playback Primary Controls + External Speed Adjuster (Cleanly grouped, no collision) */}
          <div className="flex items-center justify-center gap-3 shrink-0">
            {/* Previous Sentence Button */}
            <button
              type="button"
              id="btn-prev-chunk"
              onClick={onPrev}
              disabled={currentChunkIndex <= 0 || totalChunks === 0}
              className="p-2 rounded-full text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Lùi lại một câu"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Stop Button */}
            <button
              type="button"
              id="btn-stop-playback"
              onClick={onStop}
              disabled={!isPlaying && !isPaused}
              className="p-2 rounded-full text-neutral-600 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Dừng hẳn và về đầu"
            >
              <Square className="w-5 h-5" />
            </button>

            {/* Main Play / Pause Button */}
            {isPlaying ? (
              <button
                type="button"
                id="btn-pause-playback"
                onClick={onPause}
                className="w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all active:scale-95"
                title="Tạm dừng đọc"
              >
                <Pause className="w-5 h-5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                id="btn-play-playback"
                onClick={isPaused ? onResume : onPlay}
                disabled={totalChunks === 0}
                className="w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all active:scale-95"
                title={isPaused ? 'Tiếp tục đọc' : 'Bắt đầu đọc'}
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            )}

            {/* Next Sentence Button */}
            <button
              type="button"
              id="btn-next-chunk"
              onClick={onNext}
              disabled={currentChunkIndex >= totalChunks - 1 || totalChunks === 0}
              className="p-2 rounded-full text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Tiến tới câu kế tiếp"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-neutral-200 dark:border-neutral-800" />

            {/* External Speed Adjuster Capsule (Steppers - / + only, No presets) */}
            <div
              className="flex items-center bg-neutral-100 dark:bg-neutral-800/90 px-2 py-1 rounded-xl border border-neutral-200 dark:border-neutral-700/80 shadow-2xs gap-1.5 select-none"
              title="Điều chỉnh tốc độ đọc (- hoặc +)"
            >
              <div className="flex items-center gap-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400 pl-0.5 pr-0.5">
                <Gauge className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="hidden xl:inline">Tốc độ:</span>
              </div>

              {/* Step Down Button (-0.1x) */}
              <button
                type="button"
                id="btn-speed-decrease"
                onClick={() => onSpeedChange(Math.max(0.5, parseFloat((speed - 0.1).toFixed(2))))}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 active:scale-95 transition-all font-bold cursor-pointer shadow-2xs"
                title="Giảm tốc độ (-0.1x)"
                aria-label="Giảm tốc độ"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              {/* Current Speed Badge (Click to reset 1.0x) */}
              <button
                type="button"
                id="btn-speed-reset-desktop"
                onClick={() => onSpeedChange(1.0)}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 min-w-[36px] text-center font-mono py-1 px-1 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer"
                title="Bấm để đặt lại về 1.0x"
              >
                {speed.toFixed(1)}x
              </button>

              {/* Step Up Button (+0.1x) */}
              <button
                type="button"
                id="btn-speed-increase"
                onClick={() => onSpeedChange(Math.min(2.0, parseFloat((speed + 0.1).toFixed(2))))}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 active:scale-95 transition-all font-bold cursor-pointer shadow-2xs"
                title="Tăng tốc độ (+0.1x)"
                aria-label="Tăng tốc độ"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Voice Picker, Gender Switcher, Volume & Settings (Carefully bounded, zero collision) */}
          <div className="flex items-center justify-end gap-2 flex-1 min-w-0 max-w-sm">
            {/* Quick Gender Switcher Buttons */}
            {onGenderChange && (
              <div
                className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs shrink-0"
                title="Chuyển nhanh phân loại Giọng Nam hoặc Giọng Nữ"
              >
                <button
                  type="button"
                  id="btn-voice-gender-male"
                  onClick={() => onGenderChange('male')}
                  className={`px-2 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                    selectedGender === 'male'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60'
                  }`}
                  title="Chọn Giọng Nam"
                >
                  <span>👨</span>
                  <span className="hidden xl:inline">Nam</span>
                </button>
                <button
                  type="button"
                  id="btn-voice-gender-female"
                  onClick={() => onGenderChange('female')}
                  className={`px-2 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                    selectedGender === 'female'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-300 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60'
                  }`}
                  title="Chọn Giọng Nữ"
                >
                  <span>👩</span>
                  <span className="hidden xl:inline">Nữ</span>
                </button>
              </div>
            )}

            {/* Curated Voice Selector Dropdown */}
            <div className="relative flex-1 min-w-[130px] max-w-[170px] xl:max-w-[200px]">
              <select
                id="select-active-voice"
                value={selectedVoiceId}
                onChange={(e) => onSelectVoice(e.target.value)}
                className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500 truncate cursor-pointer font-medium shadow-2xs"
                title="Chọn giọng đọc chi tiết"
              >
                {/* 1. Studio Neural */}
                <optgroup label="🌟 Giọng Studio Cao Cấp">
                  {studioVoices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.gender === 'male' ? '👨' : '👩'} {v.name}
                    </option>
                  ))}
                </optgroup>

                {/* 2. Gemini Studio AI */}
                <optgroup label="✨ Giọng Gemini AI (Truyền Cảm)">
                  {geminiVoices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.gender === 'male' ? '👨' : '👩'} {v.name}
                    </option>
                  ))}
                </optgroup>

                {/* 3. Google Standard */}
                <optgroup label="⚡ Giọng Tiêu Chuẩn Google">
                  {googleVoices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.gender === 'male' ? '👨' : '👩'} {v.name}
                    </option>
                  ))}
                </optgroup>

                {/* 4. Web Speech (Device) */}
                {webVoices.length > 0 && (
                  <optgroup label="💻 Giọng Hệ Điều Hành / Thiết Bị">
                    {webVoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Mute button */}
            <button
              type="button"
              id="btn-toggle-mute"
              onClick={handleToggleMute}
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors shrink-0"
              title={isMuted ? 'Bật lại âm thanh' : 'Tắt tiếng'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {/* Toggle fine-tuning panel */}
            <button
              type="button"
              id="btn-toggle-settings"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 shrink-0 ${
                showSettingsDrawer
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title="Cài đặt nâng cao (Cao độ, Âm lượng, Tự cuộn, Chi tiết)"
            >
              <Sliders className="w-4 h-4" />
              {showSettingsDrawer ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
