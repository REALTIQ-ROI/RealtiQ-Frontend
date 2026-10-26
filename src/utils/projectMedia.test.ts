import { describe, expect, it } from 'vitest';
import type { MediaItem, ProjectMedia } from '../types';
import { mediaItemsToProjectMedia, moveMediaItem, projectMediaToItems, validatePublicMediaBatch } from './projectMedia';

describe('project and public media handling', () => {
  it('preserves documented project media metadata during form round trips and sets cover explicitly', () => {
    const existing: ProjectMedia[] = [
      { url: 'https://cdn.test/one.jpg', public_id: 'one', type: 'image', assetId: 'asset-1', versionId: 'v2', uploadSection: 'gallery', caption: 'Front', altText: 'Front view', source: 'owner', attribution: 'Photographer', capturedAt: '2026-10-25T10:00:00.000Z', milestone: 'foundation', isCover: false },
      { url: 'https://cdn.test/two.mp4', public_id: 'two', type: 'video', caption: 'Walkthrough', isCover: true },
    ];

    const items = projectMediaToItems(existing);
    const ordered = moveMediaItem(items, 1, -1);
    const result = mediaItemsToProjectMedia(ordered);

    expect(result[0]).toMatchObject({
      public_id: 'two', caption: 'Walkthrough', isCover: true,
    });
    expect(result[1]).toMatchObject({
      public_id: 'one', assetId: 'asset-1', versionId: 'v2', uploadSection: 'gallery',
      caption: 'Front', altText: 'Front view', source: 'owner', attribution: 'Photographer',
      capturedAt: '2026-10-25T10:00:00.000Z', milestone: 'foundation', isCover: false,
    });
    expect(result[1]).not.toHaveProperty('resourceType');
  });

  it('keeps upload batches within the mounted ten-file limit', () => {
    expect(validatePublicMediaBatch(Array.from({ length: 10 }, () => new File(['x'], 'photo.jpg')))).toBeNull();
    expect(validatePublicMediaBatch(Array.from({ length: 11 }, () => new File(['x'], 'photo.jpg')))).toContain('10');
  });

  it('selects a remaining first item as cover if the chosen cover was removed', () => {
    const remaining: MediaItem[] = [
      { url: 'https://cdn.test/remaining.jpg', public_id: 'remaining', type: 'image', isCover: false },
    ];

    expect(mediaItemsToProjectMedia(remaining)).toMatchObject([{ public_id: 'remaining', isCover: true }]);
  });
});
