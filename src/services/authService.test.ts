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
    vi.mocked(api.post).mockResolvedValueOnce({ data: response } as never);
    await expect(authService.completeLoginSecondFactor('challenge-1', '123456')).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/auth/login/second-factor', { challengeId: 'challenge-1', code: '123456' });
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
