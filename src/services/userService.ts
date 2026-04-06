import { mockStore } from './mockStore';
import type { User } from '../types';

export const userService = {
  async getUsers(): Promise<User[]> {
    return mockStore.getUsers();
  },

  async getLandlords(): Promise<User[]> {
    return mockStore.getLandlords();
  },

  async updateUserName(userId: string, name: string): Promise<User> {
    return mockStore.updateUserName(userId, name);
  },
};