import { describe, expect, it } from 'vitest';
import { isVerifiedOwner } from './landlordPropertyAccess';

describe('isVerifiedOwner', () => {
  it('allows property creation only for a landlord with an explicit verified state', () => {
    expect(isVerifiedOwner({ role: 'owner', ownerVerified: true })).toBe(true);
    expect(isVerifiedOwner({ role: 'owner', ownerVerified: false })).toBe(false);
    expect(isVerifiedOwner({ role: 'owner' })).toBe(false);
    expect(isVerifiedOwner({ role: 'admin', ownerVerified: true })).toBe(false);
    expect(isVerifiedOwner(null)).toBe(false);
  });
});
