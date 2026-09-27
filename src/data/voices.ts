import { TTSVoiceInfo } from '../types';

export const SYSTEM_VOICES: TTSVoiceInfo[] = [
  // 1. Giọng Studio Neural (Phát âm chuẩn tiếng Việt, phân biệt Nam - Nữ rõ rệt)
  {
    id: 'vi-VN-NamMinhNeural',
    name: 'Nam Minh (Giọng Nam Miền Bắc)',
    shortName: 'Nam Minh (Nam)',
    gender: 'male',
    engine: 'neural-studio',
    lang: 'vi',
    tag: 'Nam Trầm Ấm',
    description: 'Giọng nam miền Bắc trầm ấm, dõng dạc, phát âm chuẩn tròn vành rõ chữ.',
    isVietnamese: true,
    isDefault: true,
  },
  {
    id: 'vi-VN-HoaiMyNeural',
    name: 'Hoài My (Giọng Nữ Miền Bắc)',
    shortName: 'Hoài My (Nữ)',
    gender: 'female',
    engine: 'neural-studio',
    lang: 'vi',
    tag: 'Nữ Ngọt Ngào',
    description: 'Giọng nữ miền Bắc ngọt ngào, truyền cảm, tự nhiên như phát thanh viên đài truyền hình.',
    isVietnamese: true,
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Guy (English Male)',
    shortName: 'Guy (Nam - EN)',
    gender: 'male',
    engine: 'neural-studio',
    lang: 'en',
    tag: 'English Male',
    description: 'Giọng nam tiếng Anh tự nhiên, điềm tĩnh và chuẩn mực.',
    isVietnamese: false,
  },
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny (English Female)',
    shortName: 'Jenny (Nữ - EN)',
    gender: 'female',
    engine: 'neural-studio',
    lang: 'en',
    tag: 'English Female',
    description: 'Giọng nữ tiếng Anh trong trẻo, biểu cảm và rõ ràng.',
    isVietnamese: false,
  },

  // 2. Giọng Gemini AI Studio (Cảm xúc sống động)
  {
    id: 'gemini-Fenrir',
    name: 'Fenrir (Gemini Nam - Trầm Hùng)',
    shortName: 'Fenrir (Nam AI)',
    gender: 'male',
    engine: 'gemini-ai',
    lang: 'vi',
    tag: 'Nam Trầm Hùng',
    description: 'Giọng nam AI mạnh mẽ, uy lực và trầm dày.',
    isVietnamese: true,
  },
  {
    id: 'gemini-Charon',
    name: 'Charon (Gemini Nam - Sâu Lắng)',
    shortName: 'Charon (Nam AI)',
    gender: 'male',
    engine: 'gemini-ai',
    lang: 'vi',
    tag: 'Nam Kể Chuyện',
    description: 'Giọng nam AI điềm đạm, lắng đọng, phù hợp đọc hồi ký hay truyện sâu sắc.',
    isVietnamese: true,
  },
  {
    id: 'gemini-Puck',
    name: 'Puck (Gemini Nam - Sôi Nổi)',
    shortName: 'Puck (Nam AI)',
    gender: 'male',
    engine: 'gemini-ai',
    lang: 'vi',
    tag: 'Nam Sôi Nổi',
    description: 'Giọng nam AI trẻ trung, hào hứng và nhiều năng lượng.',
    isVietnamese: true,
  },
  {
    id: 'gemini-Kore',
    name: 'Kore (Gemini Nữ - Dịu Dàng)',
    shortName: 'Kore (Nữ AI)',
    gender: 'female',
    engine: 'gemini-ai',
    lang: 'vi',
    tag: 'Nữ Dịu Dàng',
    description: 'Giọng nữ AI ấm áp, thư giãn, giàu cảm xúc êm đềm.',
    isVietnamese: true,
  },
  {
    id: 'gemini-Aoede',
    name: 'Aoede (Gemini Nữ - Thanh Lịch)',
    shortName: 'Aoede (Nữ AI)',
    gender: 'female',
    engine: 'gemini-ai',
    lang: 'vi',
    tag: 'Nữ Thanh Lịch',
    description: 'Giọng nữ AI trong trẻo, biểu cảm tự nhiên và thanh nhã.',
    isVietnamese: true,
  },

  // 3. Giọng Google Tiêu Chuẩn
  {
    id: 'google-vi',
    name: 'Google Tiếng Việt (Nữ)',
    shortName: 'Google Nữ (VI)',
    gender: 'female',
    engine: 'google-natural',
    lang: 'vi',
    tag: 'Tiêu Chuẩn',
    description: 'Giọng đọc Google chuẩn quen thuộc, ổn định và không giới hạn độ dài.',
    isVietnamese: true,
  },
  {
    id: 'google-en',
    name: 'Google English (Nữ)',
    shortName: 'Google Nữ (EN)',
    gender: 'female',
    engine: 'google-natural',
    lang: 'en',
    tag: 'Standard EN',
    description: 'Giọng Google chuẩn tiếng Anh.',
    isVietnamese: false,
  },
];

export function detectVoiceGender(voiceName: string): 'male' | 'female' {
  const lower = voiceName.toLowerCase();
  if (
    lower.includes('nam') ||
    lower.includes('minh') ||
    lower.includes('david') ||
    lower.includes('guy') ||
    lower.includes('mark') ||
    lower.includes('alex') ||
    lower.includes('daniel') ||
    lower.includes('george') ||
    lower.includes('fenrir') ||
    lower.includes('charon') ||
    lower.includes('puck') ||
    lower.includes('male') ||
    lower.includes('john')
  ) {
    return 'male';
  }
  return 'female';
}
