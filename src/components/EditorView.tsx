import React from 'react';
import {
  Volume2,
  FileText,
  Trash2,
  ClipboardPaste,
  Sparkles,
  BookOpen,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { ReadingStats } from '../types';

interface EditorViewProps {
  text: string;
  onChangeText: (newText: string) => void;
  stats: ReadingStats;
  onStartReading: () => void;
  onLoadSample: () => void;
  onLoadEnglishSample: () => void;
  onPasteClipboard: () => void;
  onClear: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  text,
  onChangeText,
  stats,
  onStartReading,
  onLoadSample,
  onLoadEnglishSample,
  onPasteClipboard,
  onClear,
}) => {
  return (
    <div className="max-w-4xl mx-auto pb-36 sm:pb-40 pt-6 px-4 sm:px-6">
      {/* Editor Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm overflow-hidden transition-colors">
        {/* Editor Toolbar Header */}
        <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Soạn thảo / Dán văn bản cần đọc (Tiếng Việt & Tiếng Anh)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPasteClipboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-xs"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>Dán văn bản</span>
            </button>
            <button
              type="button"
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
              title="Nạp bài văn bản tiếng Việt mẫu"
            >
              <span>🇻🇳</span>
              <span>Mẫu Tiếng Việt</span>
            </button>
            <button
              type="button"
              onClick={onLoadEnglishSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              title="Load English mindfulness sample text"
            >
              <span>🇺🇸</span>
              <span>Mẫu English</span>
            </button>
            {text && (
              <button
                type="button"
                onClick={onClear}
                className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                title="Xóa trắng"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Text Area */}
        <div className="p-4 sm:p-6">
          <textarea
            id="input-full-text"
            rows={16}
            value={text}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="Dán hoặc nhập bất kỳ văn bản nào tại đây (không giới hạn độ dài, bài báo, truyện ngắn, tài liệu học tập, nội dung suy ngẫm...)"
            className="w-full text-base sm:text-lg leading-relaxed text-neutral-800 dark:text-neutral-100 bg-transparent placeholder-neutral-400 dark:placeholder-neutral-600 border-0 focus:outline-none focus:ring-0 resize-y min-h-[350px] font-sans"
          />
        </div>

        {/* Editor Footer / Stats Bar */}
        <div className="px-5 py-4 bg-neutral-50/80 dark:bg-neutral-950/80 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400 divide-x divide-neutral-200 dark:divide-neutral-800">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {stats.words.toLocaleString()} từ
            </span>
            <span className="pl-4">{stats.characters.toLocaleString()} ký tự</span>
            <span className="pl-4">{stats.sentences} câu</span>
            <span className="pl-4 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              ~{stats.estimatedMinutes} phút đọc
            </span>
          </div>

          <button
            type="button"
            id="btn-start-reading-cta"
            onClick={onStartReading}
            disabled={!text.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all active:scale-95"
          >
            <Volume2 className="w-4 h-4" />
            <span>Phát Giọng Nói Ngay</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Feature Highlights Note */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-600 dark:text-neutral-400">
        <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 transition-colors">
          <div className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1 flex items-center gap-1.5">
            <span className="text-amber-500 font-bold">✓</span> Không giới hạn số từ
          </div>
          <p>
            Thuật toán chia tách thông minh giúp đọc những bài viết dài hàng chục nghìn từ mà không bị ngắt quãng hay lỗi trình duyệt.
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 transition-colors">
          <div className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1 flex items-center gap-1.5">
            <span className="text-amber-500 font-bold">✓</span> Đồng bộ văn bản trực quan
          </div>
          <p>
            Hệ thống làm nổi bật từng câu đang đọc trong thời gian thực và hỗ trợ nhấp để nghe từ câu bất kỳ.
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 transition-colors">
          <div className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1 flex items-center gap-1.5">
            <span className="text-amber-500 font-bold">✓</span> Giọng đọc tiếng Việt tự nhiên
          </div>
          <p>
            Tự động nhận diện và tối ưu hóa cho giọng đọc tiếng Việt của Google, Microsoft và Apple có sẵn trên thiết bị của bạn.
          </p>
        </div>
      </div>
    </div>
  );
};
