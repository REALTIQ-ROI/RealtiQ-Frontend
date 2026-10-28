import api from '../lib/axios';
import type { User, LoginPayload, RegisterPayload } from '../types';

export interface AuthenticatedLoginResponse {
  user: User;
  token: string;
}

export interface LoginSecondFactorChallenge {
  code: 'AUTH_SECOND_FACTOR_REQUIRED';
  challengeId: string;
  expiresAt: string;
  method: 'totp';
}

export type LoginResponse = AuthenticatedLoginResponse | LoginSecondFactorChallenge;

export const isLoginSecondFactorChallenge = (response: LoginResponse): response is LoginSecondFactorChallenge =>
  'code' in response && response.code === 'AUTH_SECOND_FACTOR_REQUIRED';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseAuthenticatedLoginResponse = (value: unknown): AuthenticatedLoginResponse => {
  if (!isRecord(value) || !isRecord(value.user) || typeof value.token !== 'string' || !value.token) {
    throw new Error('The sign-in response was incomplete. Please try signing in again.');
  }
  return value as unknown as AuthenticatedLoginResponse;
};

export const parseLoginResponse = (value: unknown, status: number): LoginResponse => {
  if (status === 202) {
    if (
      isRecord(value) &&
      value.code === 'AUTH_SECOND_FACTOR_REQUIRED' &&
      typeof value.challengeId === 'string' && value.challengeId.length > 0 &&
      typeof value.expiresAt === 'string' && Number.isFinite(Date.parse(value.expiresAt)) &&
      value.method === 'totp' &&
      !('user' in value) && !('token' in value)
    ) {
      return value as unknown as LoginSecondFactorChallenge;
    }
    throw new Error('The sign-in verification challenge response was incomplete. Start sign-in again or contact support.');
  }

  if (status !== 200) throw new Error('The sign-in response used an unsupported status. Please try again.');
  return parseAuthenticatedLoginResponse(value);
};

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

export interface TwoStepEnrollment {
  secret: string;
  provisioningUri: string;
  expiresAt: string;
}

export interface PhoneVerificationStatus {
  id: string;
  state: string;
  expiresAt: string;
  sentAt?: string | null;
  verifiedAt?: string | null;
  errorCode?: string | null;
}

export interface PhoneVerificationEvent {
  id: string;
  challengeId: string;
  action: string;
  attempt: number;
  at: string;
  errorCode?: string;
}

export interface AuthSession {
  id: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export const authService = {
  async getTwoStep(): Promise<{ enabled: boolean }> {
    const { data } = await api.get<{ enabled: boolean }>('/auth/two-step');
    return data;
  },

  async enrollTwoStep(body: { password: string }): Promise<TwoStepEnrollment> {
    const { data } = await api.post<TwoStepEnrollment>('/auth/two-step/enroll', body);
    return data;
  },

  async confirmTwoStep(code: string): Promise<{ enabled: true }> {
    const { data } = await api.post<{ enabled: true }>('/auth/two-step/confirm', { code });
    return data;
  },

  async account(): Promise<unknown> {
    const { data } = await api.get<unknown>('/auth/account');
    return data;
  },

  async logout(token: string): Promise<void> {
    await api.post('/auth/logout', undefined, { headers: { Authorization: `Bearer ${token}` } });
  },
  async login(payload: LoginPayload): Promise<LoginResponse> {
    // The selected login portal is a frontend hint only; the mounted login DTO is email/password.
    const { email, password } = payload;
    const { data, status } = await api.post<unknown>('/auth/login', { email, password });
    return parseLoginResponse(data, status);
  },

  async completeLoginSecondFactor(challengeId: string, code: string): Promise<AuthenticatedLoginResponse> {
    const { data, status } = await api.post<unknown>('/auth/login/second-factor', { challengeId, code });
    if (status !== 200) throw new Error('The authenticator response used an unsupported status. Please try signing in again.');
    return parseAuthenticatedLoginResponse(data);
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

  async startPhoneVerification(idempotencyKey: string): Promise<PhoneVerificationStatus> {
    const { data } = await api.post<PhoneVerificationStatus>('/auth/phone-verification', {}, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return data;
  },

  async phoneVerificationHistory(limit = 25, before?: string): Promise<{ events: PhoneVerificationEvent[]; nextCursor: string | null }> {
    const { data } = await api.get<{ events: PhoneVerificationEvent[]; nextCursor: string | null }>('/auth/phone-verification/history', {
      params: { limit, ...(before ? { before } : {}) },
    });
    return data;
  },

  async phoneVerification(id: string): Promise<PhoneVerificationStatus> {
    const { data } = await api.get<PhoneVerificationStatus>(`/auth/phone-verification/${encodeURIComponent(id)}`);
    return data;
  },

  async verifyPhone(id: string, code: string): Promise<PhoneVerificationStatus> {
    const { data } = await api.post<PhoneVerificationStatus>(`/auth/phone-verification/${encodeURIComponent(id)}/verify`, { code });
    return data;
  },

  async cancelPhoneVerification(id: string): Promise<PhoneVerificationStatus> {
    const { data } = await api.delete<PhoneVerificationStatus>(`/auth/phone-verification/${encodeURIComponent(id)}`);
    return data;
  },

  async revokeOtherSessions(): Promise<unknown> {
    const { data } = await api.delete<unknown>('/auth/sessions/others');
    return data;
  },

  async sessions(): Promise<{ sessions: AuthSession[] }> {
    const { data } = await api.get<{ sessions: AuthSession[] }>('/auth/sessions');
    return data;
  },

  async revokeSession(id: string): Promise<{ revoked: number }> {
    const { data } = await api.delete<{ revoked: number }>(`/auth/sessions/${encodeURIComponent(id)}`);
    return data;
  },
};
