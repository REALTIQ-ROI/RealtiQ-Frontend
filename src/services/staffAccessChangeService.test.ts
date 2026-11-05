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

  it('uses the documented Admin staff directory route, cursor and unassigned filter', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { staff: [], nextCursor: 'cursor-1' } } as never);
    await expect(staffAccessChangeService.listStaff({ q: 'Ada', limit: 25, after: 'cursor-0', includeUnassigned: true })).resolves.toEqual({ staff: [], nextCursor: 'cursor-1' });
    expect(api.get).toHaveBeenCalledWith('/admin/staff', { params: { limit: 25, q: 'Ada', after: 'cursor-0', includeUnassigned: true } });
  });

  it('creates Admin staff with the exact request body and bound challenge header', async () => {
    const staff = { identityId: 'identity-2', name: 'Ada Example', email: 'ada@example.test', role: 'admin', firstLoginRequired: true, invitation: { id: 'invite-1', status: 'queued', expiresAt: '2026-11-06T12:00:00.000Z' } };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { staff }, status: 201 } as never);
    await expect(staffAccessChangeService.createStaff({ name: 'Ada Example', email: 'ada@example.test', departments: ['finance', 'escrow_operations'] }, 'challenge-create')).resolves.toMatchObject({
      identityId: 'identity-2', role: 'admin', firstLoginRequired: true, invitation: { status: 'queued' },
    });
    expect(api.post).toHaveBeenCalledWith('/admin/staff', { name: 'Ada Example', email: 'ada@example.test', departments: ['finance', 'escrow_operations'] }, { headers: { 'X-Step-Up-Challenge': 'challenge-create' } });
  });

  it('resends an invitation using the exact identity route, empty body, and bound challenge', async () => {
    const staff = { identityId: 'identity/2', role: 'admin', firstLoginRequired: true, invitation: { id: 'invite-2', status: 'queued' } };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { staff }, status: 202 } as never);
    await expect(staffAccessChangeService.resendInvitation('identity/2', 'challenge-resend')).resolves.toMatchObject({ identityId: 'identity/2', invitation: { status: 'queued' } });
    expect(api.post).toHaveBeenCalledWith('/admin/staff/identity%2F2/resend-invitation', {}, { headers: { 'X-Step-Up-Challenge': 'challenge-resend' } });
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
