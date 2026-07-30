export type KycMediaKind = 'image' | 'pdf' | 'word' | 'unsupported';

const cleanUrlPath = (url: string) => {
  try {
    return new URL(url, window.location.origin).pathname.toLowerCase();
  } catch {
    return url.split(/[?#]/, 1)[0].toLowerCase();
  }
};

export const getKycMediaKind = (mimeType = '', url = ''): KycMediaKind => {
  const normalizedMime = mimeType.toLowerCase();
  const path = cleanUrlPath(url);
  if (normalizedMime.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg)$/.test(path)) return 'image';
  if (normalizedMime === 'application/pdf' || path.endsWith('.pdf')) return 'pdf';
  if (
    normalizedMime === 'application/msword' ||
    normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.(doc|docx)$/.test(path)
  ) return 'word';
  return 'unsupported';
};

export const readableKycFileType = (mimeType?: string, url?: string) => {
  const kind = getKycMediaKind(mimeType, url);
  if (kind === 'pdf') return 'PDF';
  if (kind === 'word') return url && cleanUrlPath(url).endsWith('.docx') ? 'DOCX' : 'DOC';
  if (kind === 'image') return mimeType?.replace('image/', '').toUpperCase() || 'Image';
  return mimeType || 'Unknown file type';
};
