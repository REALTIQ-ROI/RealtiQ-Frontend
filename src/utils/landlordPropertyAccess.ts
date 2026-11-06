import type { User } from '../types';

export const isVerifiedOwner = (user: Pick<User, 'role' | 'ownerVerified'> | null | undefined): boolean =>
  user?.role === 'owner' && user.ownerVerified === true;
