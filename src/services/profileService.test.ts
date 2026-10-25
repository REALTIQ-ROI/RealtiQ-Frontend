import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { profileService } from './profileService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

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

  it('submits the documented signatory DTO with its one-use challenge header', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'signatory-1' } } as never);
    const payload = { identityId: 'identity-1', authorityEvidenceId: 'evidence-1', expiresAt: '2027-01-01T00:00:00.000Z' };
    await profileService.submitSignatory(payload, 'challenge-1');
    expect(api.post).toHaveBeenCalledWith('/profiles/current/signatories', payload, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });
});
