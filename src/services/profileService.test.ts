import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { profileService } from './profileService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

describe('profile context contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('follows authorized membership cursors and loads the selected workspace explicitly', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { profiles: [{ id: 'p1' }], nextCursor: 'membership-1' } })
      .mockResolvedValueOnce({ data: { profiles: [{ id: 'p2' }], nextCursor: null } })
      .mockResolvedValueOnce({ data: { profile: { id: 'p2' } } });
    expect((await profileService.list()).profiles.map((profile) => profile.id)).toEqual(['p1', 'p2']);
    expect(api.get).toHaveBeenNthCalledWith(1, '/profiles', { params: { limit: 100 } });
    expect(api.get).toHaveBeenNthCalledWith(2, '/profiles', { params: { limit: 100, after: 'membership-1' } });
    expect(await profileService.current('p2')).toEqual({ profile: { id: 'p2' } });
    expect(api.get).toHaveBeenNthCalledWith(3, '/profiles/current', { headers: { 'X-Profile-ID': 'p2' } });
  });

  it('creates a profile with only the documented allowlisted fields and operation key', async () => {
    const payload = { kind: 'developer' as const, structure: 'company' as const, name: 'Northstar Developments', operationKey: 'profile_create_12345678' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { profile: { id: 'profile-new', ...payload } } } as never);
    await expect(profileService.create(payload)).resolves.toMatchObject({ profile: { id: 'profile-new' } });
    expect(api.post).toHaveBeenCalledWith('/profiles', payload);
  });

  it('submits the documented signatory DTO with its one-use challenge header', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'signatory-1' } } as never);
    const payload = { identityId: 'identity-1', authorityEvidenceId: 'evidence-1', expiresAt: '2027-01-01T00:00:00.000Z' };
    await profileService.submitSignatory(payload, 'challenge-1');
    expect(api.post).toHaveBeenCalledWith('/profiles/current/signatories', payload, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });

  it('updates profile visibility with the documented versioned body and bound challenge', async () => {
    const payload = { visibility: 'public' as const, followable: true, expectedVersion: 7 };
    vi.mocked(api.patch).mockResolvedValueOnce({ data: { profile: { id: 'p1', visibility: 'public', followable: true, version: 8 } } } as never);
    await expect(profileService.updatePrivacy(payload, 'challenge-privacy')).resolves.toMatchObject({ profile: { id: 'p1', version: 8 } });
    expect(api.patch).toHaveBeenCalledWith('/profiles/current/privacy', payload, { headers: { 'X-Step-Up-Challenge': 'challenge-privacy' } });
  });
});
