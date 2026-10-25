import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { tourService } from './tourService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const tour = {
  id: 'tour-1', property: { id: 'property-1', title: 'Home' }, type: 'open_house', mode: 'physical',
  scheduledAt: '2026-11-14T10:00:00.000Z', status: 'pending', version: 0,
  createdAt: '2026-10-24T10:00:00.000Z', updatedAt: '2026-10-24T10:00:00.000Z',
};

describe('viewing contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the bare list with paging headers and sends the current version on status change', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [tour], headers: { 'x-result-count': '26', 'x-page': '2', 'x-page-count': '2' } });
    vi.mocked(api.patch).mockResolvedValue({ data: { ...tour, status: 'approved', version: 1 } });
    const page = await tourService.getTours({ page: 2, limit: 25 });
    expect(page).toEqual({ tours: [tour], resultCount: 26, page: 2, pageCount: 2 });
    expect(api.get).toHaveBeenCalledWith('/tour', { params: { page: 2, limit: 25 } });
    expect(await tourService.updateTourStatus('tour-1', { status: 'approved', expectedVersion: 0 })).toMatchObject({ status: 'approved', version: 1 });
    expect(api.patch).toHaveBeenCalledWith('/tour/tour-1', { status: 'approved', expectedVersion: 0 });
  });

  it('does not submit the incompatible paid branch', async () => {
    await expect(tourService.requestTour({ propertyId: 'property-1', type: 'virtual_paid', mode: 'virtual', scheduledAt: '2026-11-14T10:00:00.000Z' } as never)).rejects.toThrow(/unavailable/);
    expect(api.post).not.toHaveBeenCalled();
  });
});
