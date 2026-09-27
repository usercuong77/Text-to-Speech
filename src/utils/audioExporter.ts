/**
 * Encodes linear PCM 16-bit audio data into a valid downloadable WAV file with RIFF header.
 */
export function pcm16ToWavBlob(
  pcmBytes: Uint8Array,
  sampleRate: number = 24000,
  numChannels: number = 1
): Blob {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmBytes.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Copy raw PCM audio bytes
  const uint8View = new Uint8Array(buffer, 44);
  uint8View.set(pcmBytes);

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Converts a base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/[\r\n\s]/g, '');
  const binaryString = window.atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Initiates a browser file download for a given Blob
 */
export function downloadAudioBlob(blob: Blob, filename: string = 'van-ban-thanh-giong-noi.wav'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
