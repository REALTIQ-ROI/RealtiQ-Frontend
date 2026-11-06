import { describe, expect, it } from 'vitest';
import { normalizeCachedUserDTO } from './normalizeUserDTO';

describe('normalizeCachedUserDTO legacy compatibility boundary', () => {
  it('converts a cached legacy account role and drops its old verification field', () => {
    const result = normalizeCachedUserDTO({
      _id: 'owner-1',
      name: 'Ada Example',
      email: 'ada@example.test',
      role: 'landlord',
      landlordVerified: true,
    } as never);

    expect(result).toMatchObject({ role: 'owner' });
    expect(result.ownerVerified).toBeUndefined();
    expect(result).not.toHaveProperty('landlordVerified');
  });

  it('preserves canonical values when both canonical and legacy data are present', () => {
    const result = normalizeCachedUserDTO({
      _id: 'owner-1',
      name: 'Ada Example',
      email: 'ada@example.test',
      role: 'owner',
      ownerVerified: false,
      landlordVerified: true,
    } as never);

    expect(result).toMatchObject({ role: 'owner', ownerVerified: false });
    expect(result).not.toHaveProperty('landlordVerified');
  });
});
