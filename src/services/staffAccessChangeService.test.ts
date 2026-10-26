import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { staffAccessChangeService } from './staffAccessChangeService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('staffAccessChangeService', () => {
  beforeEach(() => vi.clearAllMocks());
  it('binds preparation and independent decisions to exact versioned routes', async () => {
    const change = { id: 'change-1', state: 'pending', version: 1 };
    vi.mocked(api.post).mockResolvedValue({ data: change } as never);
    const prepareBody = { targetIdentityId: '0123456789abcdef01234567', departments: ['finance'] as const };
    await staffAccessChangeService.prepare({ ...prepareBody, departments: [...prepareBody.departments] }, 'prepare-proof');
    await staffAccessChangeService.decide('change-1', { decision: 'approved', expectedVersion: 1 }, 'decision-proof');
    expect(api.post).toHaveBeenNthCalledWith(1, '/admin/staff-access-changes', { ...prepareBody, departments: ['finance'] }, { headers: { 'X-Step-Up-Challenge': 'prepare-proof' } });
    expect(api.post).toHaveBeenNthCalledWith(2, '/admin/staff-access-changes/change-1/decision', { decision: 'approved', expectedVersion: 1 }, { headers: { 'X-Step-Up-Challenge': 'decision-proof' } });
  });
});
