import api from '../lib/axios';
import type { User, LoginPayload, RegisterPayload } from '../types';

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface VerifyEmailResponse {
  message: string;
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', payload);
    return data;
  },

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const { data } = await api.post<RegisterResponse>('/auth/register', payload);
    return data;
  },

  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    const { data } = await api.get<VerifyEmailResponse>(`/auth/verify-email/${token}`);
    return data;
  },
};
