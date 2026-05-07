import api from '../lib/axios';
import type { User, LoginPayload, RegisterPayload } from '../types';

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterResponse {
  message?: string;
  user: User;
  token?: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export type RecoveryRole = 'buyer' | 'landlord';

export interface ForgotPasswordPayload {
  email: string;
  role: RecoveryRole;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface AuthMessageResponse {
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

  async forgotPassword(payload: ForgotPasswordPayload): Promise<AuthMessageResponse> {
    const { data } = await api.post<AuthMessageResponse>('/auth/forgot-password', payload);
    return data;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<AuthMessageResponse> {
    const { data } = await api.post<AuthMessageResponse>('/auth/reset-password', payload);
    return data;
  },
};
