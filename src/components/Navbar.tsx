import React, { useRef } from 'react';
import {
  Volume2,
  FileText,
  ClipboardPaste,
  Upload,
  RotateCcw,
  Sparkles,
  BookOpen,
  Edit3,
  DownloadCloud,
  Moon,
  Sun,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'reader' | 'editor';
  setActiveTab: (tab: 'reader' | 'editor') => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLoadSample: () => void;
  onLoadEnglishSample: () => void;
  onPasteClipboard: () => void;
  onFileUpload: (content: string, filename: string) => void;
  onClear: () => void;
  onOpenExportModal: () => void;
  wordCount: number;
  charCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  onToggleDarkMode,
  onLoadSample,
  onLoadEnglishSample,
  onPasteClipboard,
  onFileUpload,
  onClear,
  onOpenExportModal,
  wordCount,
  charCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        onFileUpload(content, file.name);
      }
    };
    reader.readAsText(file);
    // Reset file input so user can re-select same file if needed
    e.target.value = '';
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5 shrink-0 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100 tracking-tight whitespace-nowrap">
                  Text-to-Speech
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Không giới hạn
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden lg:block truncate">
                Chuyển văn bản dài thành giọng nói tự nhiên với ngắt câu thông minh
              </p>
            </div>
          </div>

          {/* Actions & View Controls (Responsive, perfectly spaced, zero overlapping) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex p-0.5 sm:p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shrink-0">
              <button
                type="button"
                id="btn-view-reader"
                onClick={() => setActiveTab('reader')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 ${
                  activeTab === 'reader'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
                title="Chế độ Trình đọc sách & theo dõi câu"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">Trình Đọc</span>
              </button>
              <button
                type="button"
                id="btn-view-editor"
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 ${
                  activeTab === 'editor'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
                title="Chế độ Soạn thảo & dán văn bản"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">Soạn Thảo</span>
              </button>
            </div>

            {/* Sample Buttons (Vietnamese & English) */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
              <button
                type="button"
                id="btn-load-sample-vi"
                onClick={onLoadSample}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/80 transition-colors whitespace-nowrap"
                title="Nạp bài viết mẫu tiếng Việt"
              >
                <span>🇻🇳</span>
                <span className="hidden xl:inline">Tiếng Việt</span>
              </button>

              <button
                type="button"
                id="btn-load-sample-en"
                onClick={onLoadEnglishSample}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/80 transition-colors whitespace-nowrap"
                title="Load sample English text"
              >
                <span>🇺🇸</span>
                <span className="hidden xl:inline">English</span>
              </button>
            </div>

            {/* Paste from clipboard */}
            <button
              type="button"
              id="btn-paste-clipboard"
              onClick={onPasteClipboard}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-lg text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors shrink-0"
              title="Dán nội dung từ Clipboard"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span className="hidden xl:inline whitespace-nowrap">Dán</span>
            </button>

            {/* File Upload (Hidden input + button) */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.md,.text"
              className="hidden"
            />
            <button
              type="button"
              id="btn-upload-file"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-lg text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors shrink-0"
              title="Tải lên tệp .txt hoặc .md"
            >
              <Upload className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
              <span className="hidden xl:inline whitespace-nowrap">Tải file</span>
            </button>

            {/* Audio Export modal trigger */}
            <button
              type="button"
              id="btn-open-export"
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/80 transition-colors shrink-0"
              title="Xuất file âm thanh .MP3 / .WAV"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline whitespace-nowrap">Xuất Audio</span>
            </button>

            {/* Dark Mode Toggle Button */}
            <button
              type="button"
              id="btn-toggle-dark-mode"
              onClick={onToggleDarkMode}
              className="p-1.5 sm:px-2 sm:py-1.5 text-xs font-medium rounded-lg text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors shrink-0 flex items-center gap-1"
              title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              aria-label={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              )}
              <span className="hidden lg:inline whitespace-nowrap">
                {isDarkMode ? 'Sáng' : 'Tối'}
              </span>
            </button>

            {/* Clear button */}
            <button
              type="button"
              id="btn-clear-text"
              onClick={onClear}
              className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors shrink-0"
              title="Xóa toàn bộ nội dung"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
