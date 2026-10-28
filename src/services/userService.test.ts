import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import type { User } from '../types';
import { userService } from './userService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn() } }));

describe('userService.fetchLandlords', () => {
  beforeEach(() => vi.clearAllMocks());

  it('combines staff identity details with landlord counts and verification fields', async () => {
    const users = [
      { _id: 'landlord-1', name: 'Ada Landlord', email: 'ada@example.test', phone: '+2348000000000', role: 'landlord', propertyCount: 0, landlordVerified: false, trustBadge: 'none' },
      { _id: 'buyer-1', name: 'Bola Buyer', email: 'bola@example.test', role: 'buyer' },
    ] as User[];
    const landlordCards = [
      { _id: 'landlord-1', name: undefined, email: undefined, role: 'landlord', propertyCount: 6, landlordVerified: true, trustBadge: 'gold' },
    ] as unknown as User[];
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: users } as never)
      .mockResolvedValueOnce({ data: landlordCards } as never);

    await expect(userService.fetchLandlords()).resolves.toEqual([
      {
        ...users[0],
        ...landlordCards[0],
        _id: 'landlord-1',
        role: 'landlord',
        name: 'Ada Landlord',
        email: 'ada@example.test',
        phone: '+2348000000000',
        propertyCount: 6,
        landlordVerified: true,
        trustBadge: 'gold',
      },
    ]);
    expect(api.get).toHaveBeenNthCalledWith(1, '/users');
    expect(api.get).toHaveBeenNthCalledWith(2, '/users/landlords');
  });

  it('enriches landlord details with the landlord directory projection', async () => {
    const staffUser = {
      _id: 'landlord-1', name: 'Ada Landlord', email: 'ada@example.test', phone: '+2348000000000', role: 'buyer',
    } as User;
    const landlordCards = [
      { _id: 'landlord-1', role: 'landlord', propertyCount: 6, landlordVerified: true, trustBadge: 'gold' },
    ] as User[];
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: staffUser } as never)
      .mockResolvedValueOnce({ data: landlordCards } as never);

    await expect(userService.fetchLandlordById('landlord-1')).resolves.toMatchObject({
      _id: 'landlord-1',
      role: 'landlord',
      name: 'Ada Landlord',
      email: 'ada@example.test',
      phone: '+2348000000000',
      propertyCount: 6,
      landlordVerified: true,
      trustBadge: 'gold',
    });
    expect(api.get).toHaveBeenNthCalledWith(1, '/users/landlord-1');
    expect(api.get).toHaveBeenNthCalledWith(2, '/users/landlords');
  });

  it('joins landlord cards to account details by identity even when account role differs', async () => {
    const account = {
      _id: 'landlord-1', name: 'Ada Landlord', email: 'ada@example.test', phone: '+2348000000000', role: 'buyer',
    } as User;
    const landlordCard = {
      _id: 'landlord-1', role: 'landlord', propertyCount: 6, landlordVerified: true, trustBadge: 'gold',
    } as User;
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: [account] } as never)
      .mockResolvedValueOnce({ data: [landlordCard] } as never);

    await expect(userService.fetchLandlords()).resolves.toEqual([
      expect.objectContaining({
        _id: 'landlord-1',
        role: 'landlord',
        email: 'ada@example.test',
        phone: '+2348000000000',
        propertyCount: 6,
        landlordVerified: true,
        trustBadge: 'gold',
      }),
    ]);
  });
});
