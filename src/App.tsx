import React, { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { PlayerControls } from './components/PlayerControls';
import { ReaderView } from './components/ReaderView';
import { EditorView } from './components/EditorView';
import { ExportAudioModal } from './components/ExportAudioModal';
import { SAMPLE_VIETNAMESE_TEXT, SAMPLE_ENGLISH_TEXT } from './data/sampleText';
import { segmentText } from './utils/textSegmenter';
import { useSpeechPlayer } from './hooks/useSpeechPlayer';
import { useDarkMode } from './hooks/useDarkMode';

export default function App() {
  const [text, setText] = useState<string>(SAMPLE_VIETNAMESE_TEXT);
  const [activeTab, setActiveTab] = useState<'reader' | 'editor'>('reader');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Parse and segment unlimited text into structured blocks and speech chunks with language detection
  const { blocks, chunks, stats } = useMemo(() => {
    return segmentText(text);
  }, [text]);

  // Hook managing audio synthesis with Google Natural (flawless Vietnamese & English) and Web Speech fallback
  const player = useSpeechPlayer(chunks);

  const handleLoadVietnameseSample = () => {
    player.stop();
    setText(SAMPLE_VIETNAMESE_TEXT);
    player.setLanguageMode('vi');
    setActiveTab('reader');
  };

  const handleLoadEnglishSample = () => {
    player.stop();
    setText(SAMPLE_ENGLISH_TEXT);
    player.setLanguageMode('en');
    setActiveTab('reader');
  };

  const handlePasteClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        player.stop();
        setText(clipboardText);
        player.setLanguageMode('auto');
        setActiveTab('reader');
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
      setActiveTab('editor');
    }
  };

  const handleFileUpload = (content: string) => {
    player.stop();
    setText(content);
    player.setLanguageMode('auto');
    setActiveTab('reader');
  };

  const handleClear = () => {
    player.stop();
    setText('');
    setActiveTab('editor');
  };

  const handleStartReadingFromEditor = () => {
    setActiveTab('reader');
    setTimeout(() => {
      player.play();
    }, 100);
  };

  const currentChunk = chunks[player.playbackStatus.currentChunkIndex];
  const currentChunkLang = currentChunk ? player.resolveChunkLang(currentChunk) : 'vi';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col font-sans text-neutral-900 dark:text-neutral-100 selection:bg-amber-100 dark:selection:bg-amber-900/60 selection:text-amber-900 dark:selection:text-amber-200 transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onLoadSample={handleLoadVietnameseSample}
        onLoadEnglishSample={handleLoadEnglishSample}
        onPasteClipboard={handlePasteClipboard}
        onFileUpload={handleFileUpload}
        onClear={handleClear}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        wordCount={stats.words}
        charCount={stats.characters}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'reader' ? (
          <ReaderView
            blocks={blocks}
            chunks={chunks}
            currentChunkIndex={player.playbackStatus.currentChunkIndex}
            isPlaying={player.playbackStatus.isPlaying}
            autoScroll={player.autoScroll}
            stats={stats}
            onJumpToChunk={player.jumpToChunk}
            onPlay={player.play}
            onStop={player.stop}
          />
        ) : (
          <EditorView
            text={text}
            onChangeText={(newVal) => {
              player.stop();
              setText(newVal);
            }}
            stats={stats}
            onStartReading={handleStartReadingFromEditor}
            onLoadSample={handleLoadVietnameseSample}
            onLoadEnglishSample={handleLoadEnglishSample}
            onPasteClipboard={handlePasteClipboard}
            onClear={handleClear}
          />
        )}
      </main>

      {/* Persistent Bottom Floating/Docked Player Controls */}
      <PlayerControls
        playbackStatus={player.playbackStatus}
        currentChunk={currentChunk}
        engine={player.engine}
        onEngineChange={player.setEngine}
        geminiVoice={player.geminiVoice}
        onGeminiVoiceChange={player.setGeminiVoice}
        languageMode={player.languageMode}
        onLanguageModeChange={player.setLanguageMode}
        currentChunkLang={currentChunkLang}
        voices={player.voices}
        selectedVoiceId={player.selectedVoiceId}
        onSelectVoice={player.setSelectedVoiceId}
        selectedGender={player.selectedGender}
        onGenderChange={player.setGender}
        speed={player.speed}
        onSpeedChange={player.setSpeed}
        volume={player.volume}
        onVolumeChange={player.setVolume}
        autoScroll={player.autoScroll}
        onToggleAutoScroll={() => player.setAutoScroll(!player.autoScroll)}
        onPlay={player.play}
        onPause={player.pause}
        onResume={player.resume}
        onStop={player.stop}
        onPrev={player.prevChunk}
        onNext={player.nextChunk}
        onSeek={player.jumpToChunk}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* Export Audio Modal */}
      <ExportAudioModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        fullText={text}
      />
    </div>
  );
}
