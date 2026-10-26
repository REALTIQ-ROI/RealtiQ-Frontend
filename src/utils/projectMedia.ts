import type { MediaItem, ProjectMedia } from '../types';

export const MAX_PUBLIC_MEDIA_FILES_PER_UPLOAD = 10;

export const validatePublicMediaBatch = (files: readonly File[]): string | null =>
  files.length > MAX_PUBLIC_MEDIA_FILES_PER_UPLOAD
    ? `Upload no more than ${MAX_PUBLIC_MEDIA_FILES_PER_UPLOAD} media files at a time.`
    : null;

export const moveMediaItem = <T,>(items: readonly T[], index: number, direction: -1 | 1): T[] => {
  const nextIndex = index + direction;
  if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) return [...items];
  const result = [...items];
  [result[index], result[nextIndex]] = [result[nextIndex], result[index]];
  return result;
};

/** Preserve only the media association keys allowed by the project API. */
export const projectMediaToItems = (media?: ProjectMedia[]): MediaItem[] => {
  const items = (media ?? []).map((item) => ({
    url: item.url,
    public_id: item.public_id ?? item.publicId ?? item.url,
    type: item.type,
    ...(item.assetId !== undefined ? { assetId: item.assetId } : {}),
    ...(item.versionId !== undefined ? { versionId: item.versionId } : {}),
    ...(item.uploadSection !== undefined ? { uploadSection: item.uploadSection } : {}),
    ...(item.caption !== undefined ? { caption: item.caption } : {}),
    ...(item.altText !== undefined ? { altText: item.altText } : {}),
    ...(item.source !== undefined ? { source: item.source } : {}),
    ...(item.attribution !== undefined ? { attribution: item.attribution } : {}),
    ...(item.capturedAt !== undefined ? { capturedAt: item.capturedAt } : {}),
    ...(item.milestone !== undefined ? { milestone: item.milestone } : {}),
    ...(item.isCover !== undefined ? { isCover: item.isCover } : {}),
  }));
  const coverIndex = items.findIndex((item) => item.isCover);
  const selectedCover = coverIndex >= 0 ? coverIndex : items.length ? 0 : -1;
  return items.map((item, index) => ({ ...item, isCover: index === selectedCover }));
};

/** Serialize the complete ordered project media association list with exactly one cover when non-empty. */
export const mediaItemsToProjectMedia = (media: MediaItem[]): ProjectMedia[] => {
  const selectedCover = media.findIndex((item) => item.isCover);
  const coverIndex = selectedCover >= 0 ? selectedCover : media.length ? 0 : -1;
  return media.map((item, index) => ({
    url: item.url,
    public_id: item.public_id,
    type: item.type === 'video' ? 'video' : 'image',
    ...(item.assetId !== undefined ? { assetId: item.assetId } : {}),
    ...(item.versionId !== undefined ? { versionId: item.versionId } : {}),
    ...(item.uploadSection !== undefined ? { uploadSection: item.uploadSection } : {}),
    ...(item.caption !== undefined ? { caption: item.caption } : {}),
    ...(item.altText !== undefined ? { altText: item.altText } : {}),
    ...(item.source !== undefined ? { source: item.source } : {}),
    ...(item.attribution !== undefined ? { attribution: item.attribution } : {}),
    ...(item.capturedAt !== undefined ? { capturedAt: item.capturedAt } : {}),
    ...(item.milestone !== undefined ? { milestone: item.milestone } : {}),
    isCover: index === coverIndex,
  }));
};
