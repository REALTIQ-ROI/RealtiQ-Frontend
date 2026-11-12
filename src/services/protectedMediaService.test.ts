import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { protectedMediaService } from './protectedMediaService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('protectedMediaService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads server-selected access levels without caching', async () => {
    const response = { levels: [], freeModels: [], buyerPassDurationHours: null, grantDurationHours: null, prices: { paidItem: { state: 'unavailable' }, buyerPass: { state: 'unavailable' }, sellerSponsored: { state: 'unavailable' } }, readiness: { policy: { state: 'unconfigured' }, collection: { state: 'unavailable' }, privateStorage: { state: 'configured' }, privateEnvelope: { state: 'configured' }, videoRenderer: { state: 'not_required' }, purchases: { paidItem: { state: 'unavailable', usableToAttempt: false, reasonCodes: ['FEATURE_MEDIA_PRICE_UNCONFIGURED'] } } } };
    vi.mocked(api.get).mockResolvedValue({ data: response });
    await expect(protectedMediaService.getAccessOptions()).resolves.toMatchObject({ readiness: { policy: { state: 'unconfigured' }, purchases: { paidItem: { usableToAttempt: false } } } });
    expect(api.get).toHaveBeenCalledWith('/media/access-options', { headers: { 'Cache-Control': 'no-store' } });
  });

  it('posts one multipart request with the challenge header and leaves boundary ownership to the browser', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { item: { id: 'item-1' } } });
    const form = new FormData();
    form.append('file', new File(['x'], 'view.pdf', { type: 'application/pdf' }));
    form.append('mediaKind', 'floor_plan');
    form.append('__stepUpFileSha256', 'a'.repeat(64));
    await protectedMediaService.uploadItem('property', 'property-1', form, 'challenge-1');
    expect(api.post).toHaveBeenCalledWith('/media/resources/property/property-1/items', form, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
    expect(form.getAll('file')).toHaveLength(1);
  });

  it('fetches protected bytes through the authenticated API client and captures the view audit ID', async () => {
    const blob = new Blob(['safe'], { type: 'application/pdf' });
    vi.mocked(api.get).mockResolvedValue({ data: blob, headers: { 'content-type': 'application/pdf', 'x-media-view-id': 'view-1' } });
    const result = await protectedMediaService.getContent('item-1');
    expect(api.get).toHaveBeenCalledWith('/media/items/item-1/content', { headers: { 'Cache-Control': 'no-store' }, responseType: 'blob', params: undefined });
    expect(result).toEqual({ blob, contentType: 'application/pdf', viewId: 'view-1' });
  });
});
