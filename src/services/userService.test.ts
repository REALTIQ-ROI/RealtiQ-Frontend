import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import type { User } from '../types';
import { userService } from './userService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn() } }));

describe('userService owner account APIs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the canonical owner directory without joining another endpoint', async () => {
    const owners = [
      { _id: 'owner-1', name: 'Ada Example', email: 'ada@example.test', phone: '+2348000000000', role: 'owner', propertyCount: 6, ownerVerified: true, trustBadge: 'gold' },
    ] as User[];
    vi.mocked(api.get).mockResolvedValueOnce({ data: owners } as never);

    await expect(userService.fetchOwners()).resolves.toEqual(owners);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/users/owners');
  });

  it('loads an owner detail from the authorized account route', async () => {
    const owner = {
      _id: 'owner-1', name: 'Ada Example', email: 'ada@example.test', phone: '+2348000000000', role: 'owner',
      propertyCount: 6, ownerVerified: true, trustBadge: 'gold', accountStatus: 'active', emailVerified: true,
    } as User;
    vi.mocked(api.get).mockResolvedValueOnce({ data: owner } as never);

    await expect(userService.fetchOwnerById('owner/1')).resolves.toMatchObject(owner);
    expect(api.get).toHaveBeenCalledWith('/users/owner%2F1');
  });

});
