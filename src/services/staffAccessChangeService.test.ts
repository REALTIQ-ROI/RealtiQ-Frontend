import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { parseStaffAccessChanges, staffAccessChangeService } from './staffAccessChangeService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const change = { id: 'change-1', targetIdentityId: 'identity-1', departments: ['finance'], state: 'prepared', preparedBy: 'executive-1', version: 0 };

describe('staff access API contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts the documented changes envelope and rejects an undocumented bare array', () => {
    expect(parseStaffAccessChanges({ changes: [change] })).toEqual([change]);
    expect(() => parseStaffAccessChanges([change])).toThrow(/unsupported response/);
  });

  it('uses the documented staff directory route and cursor parameters', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { staff: [], nextCursor: 'cursor-1' } } as never);
    await expect(staffAccessChangeService.listStaff({ q: 'Ada', limit: 25, after: 'cursor-0' })).resolves.toEqual({ staff: [], nextCursor: 'cursor-1' });
    expect(api.get).toHaveBeenCalledWith('/admin/staff', { params: { limit: 25, q: 'Ada', after: 'cursor-0' } });
  });

  it('sends exact step-up headers and parses the change envelope for prepare and decision', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { change } } as never).mockResolvedValueOnce({ data: { change: { ...change, state: 'approved', version: 1 } } } as never);
    const prepared = await staffAccessChangeService.prepare({ targetIdentityId: 'identity-1', departments: ['finance'] }, 'challenge-1');
    expect(prepared).toEqual(change);
    expect(api.post).toHaveBeenNthCalledWith(1, '/admin/staff-access-changes', { targetIdentityId: 'identity-1', departments: ['finance'] }, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
    const decision = await staffAccessChangeService.decide('change-1', { decision: 'approved', expectedVersion: 0 }, 'challenge-2');
    expect(decision.state).toBe('approved');
    expect(api.post).toHaveBeenNthCalledWith(2, '/admin/staff-access-changes/change-1/decision', { decision: 'approved', expectedVersion: 0 }, { headers: { 'X-Step-Up-Challenge': 'challenge-2' } });
  });
});
