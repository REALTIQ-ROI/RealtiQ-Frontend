import { describe, expect, it } from 'vitest';
import { isVerifiedLandlord } from './landlordPropertyAccess';

describe('isVerifiedLandlord', () => {
  it('allows property creation only for a landlord with an explicit verified state', () => {
    expect(isVerifiedLandlord({ role: 'landlord', landlordVerified: true })).toBe(true);
    expect(isVerifiedLandlord({ role: 'landlord', landlordVerified: false })).toBe(false);
    expect(isVerifiedLandlord({ role: 'landlord' })).toBe(false);
    expect(isVerifiedLandlord({ role: 'admin', landlordVerified: true })).toBe(false);
    expect(isVerifiedLandlord(null)).toBe(false);
  });
});
