import api from '../lib/axios';
import type { UpdateUserPayload, User } from '../types';

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const mergeLandlordDetails = (landlord: User, staffUser?: User): User => ({
  ...(staffUser ?? {}),
  ...landlord,
  _id: landlord._id || staffUser?._id || '',
  // The landlord directory endpoint is the authoritative source for this
  // screen's entity type. Account-level role data can differ from the seller
  // card when an identity owns more than one profile.
  role: 'landlord',
  name: nonEmptyString(staffUser?.name) ?? nonEmptyString(landlord.name) ?? '',
  email: nonEmptyString(staffUser?.email) ?? nonEmptyString(landlord.email) ?? '',
  phone: nonEmptyString(staffUser?.phone) ?? nonEmptyString(landlord.phone),
  propertyCount: landlord.propertyCount ?? staffUser?.propertyCount,
  landlordVerified: landlord.landlordVerified ?? staffUser?.landlordVerified,
  trustBadge: landlord.trustBadge ?? staffUser?.trustBadge,
  isVerified: landlord.isVerified ?? staffUser?.isVerified,
  kyc: landlord.kyc ?? staffUser?.kyc,
  createdAt: staffUser?.createdAt ?? landlord.createdAt,
  updatedAt: staffUser?.updatedAt ?? landlord.updatedAt,
});

export const userService = {
  async fetchUsers(): Promise<User[]> {
    const { data } = await api.get<User[]>('/users');
    return data;
  },

  async fetchLandlords(): Promise<User[]> {
    const [users, landlordCards] = await Promise.all([
      this.fetchUsers(),
      api.get<User[]>('/users/landlords').then((response) => response.data),
    ]);
    // Join by identity, not by account role: a landlord profile can belong to
    // an identity whose account-level role projection is different.
    const staffUsersById = new Map(users.map((user) => [user._id, user]));

    return landlordCards.map((landlord) => mergeLandlordDetails(landlord, staffUsersById.get(landlord._id)));
  },

  async fetchLandlordById(id: string): Promise<User> {
    const [staffUser, { data: landlordCards }] = await Promise.all([
      this.fetchUserById(id),
      api.get<User[]>('/users/landlords'),
    ]);
    const landlord = landlordCards.find((candidate) => candidate._id === id);
    return landlord ? mergeLandlordDetails(landlord, staffUser) : staffUser;
  },

  async fetchUserById(id: string): Promise<User> {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },

  async updateUser(id: string, payload: UpdateUserPayload, challengeId?: string): Promise<User> {
    const { data } = await api.patch<User>(`/users/${encodeURIComponent(id)}`, payload, {
      headers: challengeId ? { 'X-Step-Up-Challenge': challengeId } : undefined,
    });
    return data;
  },

  async deleteUser(id: string, challengeId?: string): Promise<{ message: string; id: string }> {
    const { data } = await api.delete<{ message: string; id: string }>(`/users/${encodeURIComponent(id)}`, {
      data: {},
      headers: challengeId ? { 'X-Step-Up-Challenge': challengeId } : undefined,
    });
    return data;
  },

  async getUsers(): Promise<User[]> {
    return this.fetchUsers();
  },

  async getLandlords(): Promise<User[]> {
    return this.fetchLandlords();
  },

  async getUserById(id: string): Promise<User> {
    return this.fetchUserById(id);
  },

  async updateUserName(userId: string, name: string, challengeId?: string): Promise<User> {
    return this.updateUser(userId, { name }, challengeId);
  },
};
