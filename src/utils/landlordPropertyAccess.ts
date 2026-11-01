import type { User } from '../types';

export const isVerifiedLandlord = (user: Pick<User, 'role' | 'landlordVerified'> | null | undefined): boolean =>
  user?.role === 'landlord' && user.landlordVerified === true;
