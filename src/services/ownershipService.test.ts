import { describe, expect, it } from 'vitest';
import { isConfirmedOwnership, type OwnershipRecord } from './ownershipService';

describe('isConfirmedOwnership', () => {
  it('counts a property only when the server returns the owned state', () => {
    expect(isConfirmedOwnership({ status: 'owned' })).toBe(true);
    expect(isConfirmedOwnership({ status: 'pending_allocation' })).toBe(false);
    expect(isConfirmedOwnership({} as OwnershipRecord)).toBe(false);
  });
});
