import React, { useState } from 'react';
import {
  X,
  Download,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { base64ToUint8Array, downloadAudioBlob, pcm16ToWavBlob } from '../utils/audioExporter';
import { detectLanguage, cleanMarkdownForSpeech } from '../utils/textSegmenter';

interface ExportAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullText: string;
}

const EXPORT_VOICES = [
  { id: 'vi-VN-NamMinhNeural', name: '👨 Nam Minh (Nam - Giọng chuẩn Miền Bắc .MP3)', type: 'neural', lang: 'vi' },
  { id: 'vi-VN-HoaiMyNeural', name: '👩 Hoài My (Nữ - Giọng ngọt ngào Miền Bắc .MP3)', type: 'neural', lang: 'vi' },
  { id: 'gemini-Fenrir', name: '👨 Fenrir (Gemini AI Nam - Trầm Hùng .WAV)', type: 'gemini', lang: 'vi' },
  { id: 'gemini-Charon', name: '👨 Charon (Gemini AI Nam - Sâu Lắng .WAV)', type: 'gemini', lang: 'vi' },
  { id: 'gemini-Kore', name: '👩 Kore (Gemini AI Nữ - Dịu Dàng .WAV)', type: 'gemini', lang: 'vi' },
  { id: 'gemini-Aoede', name: '👩 Aoede (Gemini AI Nữ - Thanh Lịch .WAV)', type: 'gemini', lang: 'vi' },
  { id: 'google-vi', name: '👩 Google Nữ (Tiếng Việt Tiêu Chuẩn .MP3)', type: 'google', lang: 'vi' },
  { id: 'en-US-GuyNeural', name: '👨 Guy (English Male - Studio .MP3)', type: 'neural', lang: 'en' },
  { id: 'en-US-JennyNeural', name: '👩 Jenny (English Female - Studio .MP3)', type: 'neural', lang: 'en' },
];

export const ExportAudioModal: React.FC<ExportAudioModalProps> = ({
  isOpen,
  onClose,
  fullText,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioExtension, setAudioExtension] = useState<'wav' | 'mp3'>('mp3');
  const [selectedVoiceId, setSelectedVoiceId] = useState('vi-VN-NamMinhNeural');
  const [exportSpeed, setExportSpeed] = useState<number>(1.0);
  const [textSnippet, setTextSnippet] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
      setGeneratedBlob(null);
      setAudioUrl(null);
      // Snippet up to 1500 chars
      const snippet = fullText.slice(0, 1500);
      setTextSnippet(snippet);
      const detected = detectLanguage(snippet);
      if (detected === 'en') {
        setSelectedVoiceId('en-US-GuyNeural');
      } else {
        setSelectedVoiceId('vi-VN-NamMinhNeural');
      }
    }
  }, [isOpen, fullText]);

  if (!isOpen) return null;

  const handleGenerateAudio = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const speechText = cleanMarkdownForSpeech(textSnippet);
      if (!speechText.trim()) {
        throw new Error('Đoạn văn bản sau khi xử lý không có nội dung phát âm.');
      }

      const voiceInfo = EXPORT_VOICES.find((v) => v.id === selectedVoiceId) || EXPORT_VOICES[0];

      if (voiceInfo.type === 'gemini') {
        const geminiName = voiceInfo.id.replace('gemini-', '');
        const response = await fetch('/api/tts/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: speechText,
            voiceName: geminiName,
            lang: voiceInfo.lang,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || 'Không thể tạo âm thanh AI. Bạn có thể chọn Giọng Nam Minh hoặc Hoài My (.MP3) để xuất nhanh.'
          );
        }

        if (!data.audio) {
          throw new Error('Dữ liệu âm thanh trả về rỗng.');
        }

        const pcmBytes = base64ToUint8Array(data.audio);
        const wavBlob = pcm16ToWavBlob(pcmBytes, 24000, 1);
        const url = URL.createObjectURL(wavBlob);

        setGeneratedBlob(wavBlob);
        setAudioUrl(url);
        setAudioExtension('wav');
        setSuccess(true);
      } else {
        // High fidelity Studio Neural or Google Natural
        const streamUrl = `/api/tts/stream?text=${encodeURIComponent(speechText)}&voice=${encodeURIComponent(
          voiceInfo.id
        )}&lang=${voiceInfo.lang}&speed=${exportSpeed}`;
        const response = await fetch(streamUrl);
        if (!response.ok) {
          throw new Error('Không thể tải luồng âm thanh từ máy chủ.');
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setGeneratedBlob(blob);
        setAudioUrl(url);
        setAudioExtension('mp3');
        setSuccess(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Có lỗi xảy ra khi tạo tệp âm thanh.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (generatedBlob) {
      const selected = EXPORT_VOICES.find((v) => v.id === selectedVoiceId);
      const voiceLabel = selected?.id.includes('Nam') || selected?.id.includes('Fenrir') ? 'nam' : 'nu';
      const filename = `audio-${voiceLabel}-${Date.now().toString().slice(-4)}.${audioExtension}`;
      downloadAudioBlob(generatedBlob, filename);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full overflow-hidden transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-base">
                Xuất Tệp Âm Thanh
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Tải tệp âm thanh phát âm chuẩn Nam hoặc Nữ về máy (.MP3 / .WAV)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Chọn giọng đọc và định dạng xuất
            </label>
            <select
              value={selectedVoiceId}
              onChange={(e) => setSelectedVoiceId(e.target.value)}
              className="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-amber-500 font-medium cursor-pointer"
            >
              <optgroup label="🌟 Giọng Studio Cao Cấp (Nam & Nữ Chuẩn .MP3)">
                {EXPORT_VOICES.filter((v) => v.type === 'neural').map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="✨ Giọng Gemini AI (Truyền Cảm .WAV)">
                {EXPORT_VOICES.filter((v) => v.type === 'gemini').map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="⚡ Giọng Tiêu Chuẩn Google (.MP3)">
                {EXPORT_VOICES.filter((v) => v.type === 'google').map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
            </select>

            <div className="flex items-center justify-between mt-2.5 bg-neutral-50 dark:bg-neutral-800/60 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Tốc độ xuất file:</span>
              <div className="flex items-center gap-1">
                {[1.0, 1.25, 1.5, 2.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setExportSpeed(s)}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                      Math.abs(exportSpeed - s) < 0.05
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {s === 1.0 ? '1.0x' : `${s}x`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Đoạn văn bản xuất audio (Tối đa 1.500 ký tự mỗi lần):
            </label>
            <textarea
              rows={4}
              value={textSnippet}
              onChange={(e) => setTextSnippet(e.target.value)}
              className="w-full text-xs text-neutral-800 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2.5 focus:ring-1 focus:ring-amber-500 font-sans placeholder-neutral-400 dark:placeholder-neutral-500"
              placeholder="Nhập hoặc chỉnh sửa đoạn văn bản cần xuất ra file âm thanh..."
            />
            <div className="flex justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              <span>{textSnippet.length} ký tự</span>
              {fullText.length > 1500 && (
                <span className="text-amber-700 dark:text-amber-400 font-medium">
                  Đã tự động trích đoạn đầu của văn bản dài
                </span>
              )}
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Audio Preview after generation */}
          {success && audioUrl && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã tạo file âm thanh {audioExtension.toUpperCase()} thành công!</span>
              </div>
              <audio controls src={audioUrl} className="w-full h-9 rounded" />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950/80 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {!success ? (
              <button
                type="button"
                onClick={handleGenerateAudio}
                disabled={loading || !textSnippet.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tạo âm thanh...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tạo tệp âm thanh</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải tệp .{audioExtension.toUpperCase()} về máy</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
