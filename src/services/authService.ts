import { mockStore } from './mockStore';
import type { AuthResponse, LoginPayload, RegisterPayload } from '../types';

const buildToken = (userId: string) => `mock-jwt-${userId}-${Date.now()}`;

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const user = mockStore.login(payload);
    return {
      user,
      token: buildToken(user._id),
    };
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const user = mockStore.register(payload);
    return {
      user,
      token: buildToken(user._id),
    };
  },
};