import type { User, UserRole } from '../types';

/** Migrates only a previously cached account role; server DTOs use the canonical owner fields. */
export const normalizeCachedUserDTO = (user: User): User => {
  const legacy = user as User & { role: UserRole | 'landlord'; landlordVerified?: boolean };
  const canonical = { ...legacy } as User & { landlordVerified?: boolean };
  delete canonical.landlordVerified;
  return {
    ...canonical,
    role: legacy.role === 'landlord' ? 'owner' : legacy.role,
  };
};
