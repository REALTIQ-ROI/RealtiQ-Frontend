import { describe, expect, it } from 'vitest';
import type { User } from '../types';
import { isUserVerified } from './userVerification';

const user = (values: Partial<User>): User => ({ _id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'buyer', ...values });

describe('isUserVerified', () => {
  it('uses email verification for regular users', () => {
    expect(isUserVerified(user({ emailVerified: true, isVerified: false }))).toBe(true);
  });
  it('uses only the canonical owner verification field for owners', () => {
    expect(isUserVerified(user({ role: 'owner', ownerVerified: true }))).toBe(true);
    expect(isUserVerified(user({ role: 'owner', ownerVerified: false, emailVerified: true, kyc: { status: 'approved' } }))).toBe(false);
  });
  it('supports legacy isVerified responses', () => {
    expect(isUserVerified(user({ isVerified: true }))).toBe(true);
  });
  it('does not treat pending or missing verification as verified', () => {
    expect(isUserVerified(user({ emailVerified: false }))).toBe(false);
    expect(isUserVerified(user({ role: 'owner', kyc: { status: 'pending' } }))).toBe(false);
  });
});
