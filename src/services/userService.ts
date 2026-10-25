import api from '../lib/axios';
import type { UpdateUserPayload, User } from '../types';

export const userService = {
  async fetchUsers(): Promise<User[]> {
    const { data } = await api.get<User[]>('/users');
    return data;
  },

  async fetchLandlords(): Promise<User[]> {
    const { data } = await api.get<User[]>('/users/landlords');
    return data;
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
