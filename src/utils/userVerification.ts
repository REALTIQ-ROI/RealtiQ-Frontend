import type { User } from '../types';

/** Resolves active verification fields while supporting legacy API responses. */
export const isUserVerified = (user?: User | null): boolean => {
  if (!user) return false;
  if (user.role === 'owner') {
    return user.ownerVerified === true;
  }
  return user.emailVerified === true || user.isVerified === true;
};
