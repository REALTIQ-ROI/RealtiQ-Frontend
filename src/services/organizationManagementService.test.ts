import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { organizationManagementService } from './organizationManagementService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

describe('organizationManagementService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads only the current profile roster with bounded paging', async () => {
    const page = { members: [], nextCursor: null };
    vi.mocked(api.get).mockResolvedValue({ data: page } as never);
    await expect(organizationManagementService.listMembers({ limit: 50, after: 'member-1' })).resolves.toEqual(page);
    expect(api.get).toHaveBeenCalledWith('/profiles/current/members', { params: { limit: 50, after: 'member-1' } });
  });

  it('binds a direct member addition to step-up without adding caller permissions', async () => {
    const response = { member: { id: 'membership-1', profileId: 'org-1', identityId: 'identity-1', role: 'viewer', deniedPermissions: [], state: 'active', ownerSeat: false, assignedOnly: false, assignedResources: [], version: 1 } };
    const body = { identityId: 'identity-1', role: 'viewer' as const };
    vi.mocked(api.post).mockResolvedValue({ data: response } as never);
    await expect(organizationManagementService.addMember(body, 'challenge-1')).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/profiles/current/members', body, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });

  it('keeps invitation tokens out of query parameters and sends the token only in the claim body', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { profileId: 'org-1' } } as never);
    await organizationManagementService.claimInvitation('opaque-token');
    expect(api.post).toHaveBeenCalledWith('/profiles/invitations/claim', { token: 'opaque-token' });
  });
});
