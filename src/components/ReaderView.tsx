import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Type,
  Maximize2,
  Clock,
  BookOpen,
  AlignLeft,
} from 'lucide-react';
import { ParagraphBlock, ReadingStats, TextChunk } from '../types';

interface ReaderViewProps {
  blocks: ParagraphBlock[];
  chunks: TextChunk[];
  currentChunkIndex: number;
  isPlaying: boolean;
  autoScroll: boolean;
  stats: ReadingStats;
  onJumpToChunk: (index: number) => void;
  onPlay: () => void;
  onStop: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  blocks,
  chunks,
  currentChunkIndex,
  isPlaying,
  autoScroll,
  stats,
  onJumpToChunk,
  onPlay,
  onStop,
}) => {
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [lineSpacing, setLineSpacing] = useState<'normal' | 'relaxed' | 'loose'>('relaxed');
  const activeSentenceRef = useRef<HTMLSpanElement | null>(null);

  // Auto-scroll to active sentence when it changes
  useEffect(() => {
    if (autoScroll && activeSentenceRef.current && isPlaying) {
      activeSentenceRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentChunkIndex, autoScroll, isPlaying]);

  const fontSizeClasses = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg leading-loose',
    xl: 'text-xl leading-loose',
  };

  const lineSpacingClasses = {
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    loose: 'leading-loose',
  };

  // Helper to render bold markdown cleanly without showing raw asterisks to the reader
  const renderReadableText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={i} className="font-semibold text-neutral-950 dark:text-neutral-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part.replace(/[*#]/g, '');
    });
  };

  return (
    <div className="max-w-4xl mx-auto pb-36 sm:pb-40 pt-6 px-4 sm:px-6">
      {/* Document Stats & Readability Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 p-4 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4 transition-colors">
        {/* Statistics */}
        <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400 divide-x divide-neutral-200 dark:divide-neutral-800">
          <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
            <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{stats.words.toLocaleString()} từ</span>
          </div>
          <div className="pl-4 flex items-center gap-1.5">
            <AlignLeft className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <span>{stats.sentences} câu</span>
          </div>
          <div className="pl-4 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <span>~{stats.estimatedMinutes} phút nghe</span>
          </div>
        </div>

        {/* Readability Controls (Font Size, Spacing) */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5 border border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              id="btn-font-sm"
              onClick={() => setFontSize('sm')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                fontSize === 'sm'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
              title="Cỡ chữ nhỏ"
            >
              A-
            </button>
            <button
              type="button"
              id="btn-font-base"
              onClick={() => setFontSize('base')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                fontSize === 'base'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
              title="Cỡ chữ vừa"
            >
              A
            </button>
            <button
              type="button"
              id="btn-font-lg"
              onClick={() => setFontSize('lg')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                fontSize === 'lg'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
              title="Cỡ chữ lớn"
            >
              A+
            </button>
          </div>

          <div className="hidden sm:flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5 border border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => setLineSpacing('normal')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                lineSpacing === 'normal'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
              title="Giãn dòng vừa"
            >
              Vừa
            </button>
            <button
              type="button"
              onClick={() => setLineSpacing('relaxed')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                lineSpacing === 'relaxed'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
              title="Giãn dòng thoáng"
            >
              Thoáng
            </button>
          </div>

          {/* Read from beginning button */}
          <button
            type="button"
            id="btn-read-from-start"
            onClick={() => {
              onJumpToChunk(0);
              if (!isPlaying) onPlay();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Đọc từ đầu</span>
          </button>
        </div>
      </div>

      {/* Main Document Reading Paper */}
      <article className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm p-6 sm:p-10 md:p-12 transition-colors">
        {blocks.length === 0 ? (
          <div className="text-center py-16 text-neutral-400 dark:text-neutral-500">
            <p className="text-base font-medium">Chưa có nội dung nào.</p>
            <p className="text-xs mt-1">
              Hãy chuyển sang tab Soạn Thảo hoặc nhấp &quot;Văn bản mẫu&quot; ở trên để bắt đầu.
            </p>
          </div>
        ) : (
          <div className={`space-y-6 ${fontSizeClasses[fontSize]} text-neutral-800 dark:text-neutral-200`}>
            {blocks.map((block) => {
              // Divider element
              if (block.isDivider) {
                return (
                  <hr
                    key={`divider-${block.id}`}
                    className="border-neutral-200 dark:border-neutral-800 my-8 w-1/3 mx-auto"
                  />
                );
              }

              // Heading element
              if (block.isHeading) {
                const headingClasses =
                  block.headingLevel === 1
                    ? 'text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-8 mb-4 border-b border-neutral-100 dark:border-neutral-800 pb-2 font-serif'
                    : block.headingLevel === 2
                    ? 'text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-6 mb-3 font-serif'
                    : 'text-lg sm:text-xl font-bold text-amber-950 dark:text-amber-400 mt-5 mb-2 font-serif';

                return (
                  <div key={`heading-${block.id}`} className={headingClasses}>
                    {block.chunks.map((chunk) => {
                      const isActive = chunk.id === currentChunkIndex;
                      return (
                        <span
                          key={`chunk-${chunk.id}`}
                          ref={isActive ? activeSentenceRef : null}
                          onClick={() => onJumpToChunk(chunk.id)}
                          className={`cursor-pointer rounded px-1 transition-all duration-200 inline ${
                            isActive
                              ? 'bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 ring-2 ring-amber-400 dark:ring-amber-500 font-bold'
                              : 'hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-900 dark:hover:text-amber-200'
                          }`}
                          title="Nhấp để nghe từ tiêu đề này"
                        >
                          {renderReadableText(chunk.rawText)}{' '}
                        </span>
                      );
                    })}
                  </div>
                );
              }

              // Regular paragraph or list item
              return (
                <p
                  key={`para-${block.id}`}
                  className={`${lineSpacingClasses[lineSpacing]} ${
                    block.isListItem ? 'pl-4 border-l-2 border-amber-300 dark:border-amber-600' : ''
                  }`}
                >
                  {block.chunks.map((chunk) => {
                    const isActive = chunk.id === currentChunkIndex;
                    const isPast = chunk.id < currentChunkIndex;

                    return (
                      <span
                        key={`chunk-${chunk.id}`}
                        ref={isActive ? activeSentenceRef : null}
                        onClick={() => onJumpToChunk(chunk.id)}
                        className={`cursor-pointer rounded transition-all duration-200 inline py-0.5 px-0.5 ${
                          isActive
                            ? 'bg-amber-100 dark:bg-amber-950/90 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400 dark:ring-amber-500 font-medium shadow-xs'
                            : isPast
                            ? 'text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
                            : 'text-neutral-900 dark:text-neutral-200 hover:bg-amber-50/70 dark:hover:bg-amber-950/40 hover:text-amber-900 dark:hover:text-amber-300'
                        }`}
                        title="Nhấp vào để phát câu này"
                      >
                        {renderReadableText(chunk.rawText)}{' '}
                      </span>
                    );
                  })}
                </p>
              );
            })}
          </div>
        )}
      </article>

      {/* Helpful Hint */}
      <div className="mt-4 text-center text-xs text-neutral-600 dark:text-neutral-400">
        💡 Mẹo: Bạn có thể nhấp chuột trực tiếp vào bất kỳ câu nào trong văn bản trên để phát ngay từ câu đó.
      </div>
    </div>
  );
};
