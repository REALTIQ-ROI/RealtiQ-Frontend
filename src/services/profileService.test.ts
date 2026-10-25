import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { profileService } from './profileService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn() } }));

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
});
