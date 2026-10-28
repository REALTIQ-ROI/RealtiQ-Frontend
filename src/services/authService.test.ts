import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { authService } from './authService';

vi.mock('../lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

describe('authService account security endpoints', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts phone verification with an empty JSON body and the documented idempotency header', async () => {
    const status = { id: 'challenge-1', state: 'pending', expiresAt: '2026-10-25T12:05:00.000Z' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: status } as never);
    await expect(authService.startPhoneVerification('operation-123')).resolves.toEqual(status);
    expect(api.post).toHaveBeenCalledWith('/auth/phone-verification', {}, { headers: { 'Idempotency-Key': 'operation-123' } });
  });

  it('uses only the documented phone code body and supports status refresh and cancellation', async () => {
    const status = { id: 'challenge/1', state: 'pending', expiresAt: '2026-10-25T12:05:00.000Z' };
    vi.mocked(api.get).mockResolvedValueOnce({ data: status } as never);
    vi.mocked(api.post).mockResolvedValueOnce({ data: status } as never);
    vi.mocked(api.delete).mockResolvedValueOnce({ data: status } as never);
    await authService.phoneVerification('challenge/1');
    await authService.verifyPhone('challenge/1', '123456');
    await authService.cancelPhoneVerification('challenge/1');
    expect(api.get).toHaveBeenCalledWith('/auth/phone-verification/challenge%2F1');
    expect(api.post).toHaveBeenCalledWith('/auth/phone-verification/challenge%2F1/verify', { code: '123456' });
    expect(api.delete).toHaveBeenCalledWith('/auth/phone-verification/challenge%2F1');
  });

  it('submits the documented login challenge and code without logging or changing them', async () => {
    const response = { user: { _id: 'user-1' }, token: 'access-token' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: response, status: 200 } as never);
    await expect(authService.completeLoginSecondFactor('challenge-1', '123456')).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/auth/login/second-factor', { challengeId: 'challenge-1', code: '123456' });
  });

  it('parses the documented 202 login challenge without treating it as an authenticated session', async () => {
    const challenge = {
      code: 'AUTH_SECOND_FACTOR_REQUIRED',
      challengeId: '66f100000000000000000001',
      expiresAt: '2026-10-27T12:05:00.000Z',
      method: 'totp',
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: challenge, status: 202 } as never);
    await expect(authService.login({ email: 'buyer@example.test', password: 'ExamplePass123!' })).resolves.toEqual(challenge);
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'buyer@example.test', password: 'ExamplePass123!' });
  });

  it('parses the normal 200 login response and rejects malformed challenge responses', async () => {
    const response = { user: { _id: 'user-1', role: 'buyer' }, token: 'Bearer jwt' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: response, status: 200 } as never);
    await expect(authService.login({ email: 'buyer@example.test', password: 'ExamplePass123!' })).resolves.toEqual(response);
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { code: 'AUTH_SECOND_FACTOR_REQUIRED', challengeId: 'challenge-1', method: 'totp' },
      status: 202,
    } as never);
    await expect(authService.login({ email: 'buyer@example.test', password: 'ExamplePass123!' })).rejects.toThrow('challenge response was incomplete');
  });

  it('sends only the documented email and password fields to the login endpoint', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { user: { _id: 'user-1', role: 'buyer' }, token: 'Bearer jwt' },
      status: 200,
    } as never);
    await authService.login({ email: 'buyer@example.test', password: 'ExamplePass123!', role: 'buyer' });
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'buyer@example.test',
      password: 'ExamplePass123!',
    });
  });

  it('requests verification resend with only the email through the unauthenticated client mode', async () => {
    const response = {
      code: 'AUTH_EMAIL_REQUEST_ACCEPTED',
      message: 'If the account is eligible, instructions will be sent. Check your inbox or request another link later.',
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: response, status: 202 } as never);

    await expect(authService.resendVerificationEmail('person@example.com')).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/auth/resend-verification', { email: 'person@example.com' }, { skipAuth: true });
  });

  it('requires a 200 authenticated response after second-factor verification', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { status: 'pending' }, status: 202 } as never);
    await expect(authService.completeLoginSecondFactor('challenge-1', '123456')).rejects.toThrow('unsupported status');
  });

  it('returns the documented safe phone verification history rows', async () => {
    const response = { events: [{ id: 'event-1', challengeId: 'challenge-1', action: 'sent', attempt: 1, at: '2026-10-25T12:00:00.000Z' }], nextCursor: null };
    vi.mocked(api.get).mockResolvedValueOnce({ data: response } as never);
    await expect(authService.phoneVerificationHistory(25)).resolves.toEqual(response);
    expect(api.get).toHaveBeenCalledWith('/auth/phone-verification/history', { params: { limit: 25 } });
  });

  it('revokes other sessions through the mounted session endpoint', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { message: 'Sessions revoked' } } as never);
    await authService.revokeOtherSessions();
    expect(api.delete).toHaveBeenCalledWith('/auth/sessions/others');
  });

  it('lists the documented active session projection and revokes one encoded session id', async () => {
    const response = { sessions: [{ id: 'session/1', createdAt: '2026-10-01T00:00:00.000Z', expiresAt: '2026-11-01T00:00:00.000Z', current: false }] };
    vi.mocked(api.get).mockResolvedValueOnce({ data: response } as never);
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { revoked: 1 } } as never);

    await expect(authService.sessions()).resolves.toEqual(response);
    await expect(authService.revokeSession('session/1')).resolves.toEqual({ revoked: 1 });
    expect(api.get).toHaveBeenCalledWith('/auth/sessions');
    expect(api.delete).toHaveBeenLastCalledWith('/auth/sessions/session%2F1');
  });
});
