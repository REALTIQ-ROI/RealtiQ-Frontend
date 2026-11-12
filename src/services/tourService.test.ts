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

  it('loads the selected profile viewing-assignee directory with an opaque cursor', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { assignees: [{ identityId: 'opaque-assignment-id', displayName: 'Ada Nwosu', role: 'sales_agent', assignmentEligible: true }], nextCursor: 'va1.opaque' } });
    await expect(tourService.listViewingAssignees({ limit: 100, after: 'va1.previous' })).resolves.toMatchObject({ nextCursor: 'va1.opaque', assignees: [{ displayName: 'Ada Nwosu', assignmentEligible: true }] });
    expect(api.get).toHaveBeenCalledWith('/profiles/current/viewing-assignees', { params: { limit: 100, after: 'va1.previous' }, headers: { 'Cache-Control': 'no-store' } });
  });

  it('requires the server-returned participant join path before requesting a live-video URL', async () => {
    await expect(tourService.getJoinUrl('tour-1', null)).rejects.toThrow(/not confirmed/i);
    expect(api.get).not.toHaveBeenCalled();
    vi.mocked(api.get).mockResolvedValue({ data: { joinUrl: 'https://zoom.example/participant' } });
    await expect(tourService.getJoinUrl('tour-1', '/api/tour/tour-1/video-session/join')).resolves.toBe('https://zoom.example/participant');
    expect(api.get).toHaveBeenCalledWith('/tour/tour-1/video-session/join', { headers: { 'Cache-Control': 'no-store' } });
  });
});
