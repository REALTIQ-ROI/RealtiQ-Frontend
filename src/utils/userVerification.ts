import type { User } from '../types';

/** Resolves active verification fields while supporting legacy API responses. */
export const isUserVerified = (user?: User | null): boolean => {
  if (!user) return false;
  if (user.role === 'landlord') {
    return user.landlordVerified === true || user.kyc?.status === 'approved' || user.isVerified === true;
  }
  return user.emailVerified === true || user.isVerified === true;
};
