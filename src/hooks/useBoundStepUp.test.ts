import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../contexts/AuthContext';
import { ApiRequestError } from '../lib/axios';
import { stepUpService } from '../services/stepUpService';
import { stepUpErrorMessage, useBoundStepUp } from './useBoundStepUp';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../services/stepUpService', () => ({ stepUpService: { start: vi.fn(), verify: vi.fn() } }));

const setProfile = (id: string) => {
  localStorage.setItem('activeProfileId', id);
  localStorage.setItem('token', 'session-1');
  vi.mocked(useAuth).mockReturnValue({ activeProfile: { id }, token: 'session-1' } as ReturnType<typeof useAuth>);
};

describe('useBoundStepUp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    setProfile('profile-1');
    vi.mocked(stepUpService.start).mockResolvedValue({ challengeId: 'challenge-1', expiresAt: new Date(Date.now() + 60_000).toISOString(), method: 'totp' });
    vi.mocked(stepUpService.verify).mockResolvedValue(undefined);
  });

  it('honors Retry-After in rate-limit recovery guidance', () => {
    expect(stepUpErrorMessage(new ApiRequestError('Rate limited', {
      status: 429,
      code: 'AUTH_FACTOR_RATE_LIMITED',
      retryAfter: '12',
    }))).toContain('Wait at least 12 seconds');
  });

  it('sends the exact frozen JSON body to initiation and the protected action after TOTP', async () => {
    const execute = vi.fn(async (challengeId: string, body: { expectedVersion: number; publicationAction: string }) => ({ challengeId, body }));
    const { result } = renderHook(() => useBoundStepUp<{ challengeId: string; body: { expectedVersion: number; publicationAction: string } }>());
    const body = { expectedVersion: 8, publicationAction: 'publish_all_ready' };
    await act(async () => { expect(await result.current.begin({ method: 'PATCH', path: '/api/projects/project-1', body, label: 'Publish project', execute })).toBe(true); });
    expect(stepUpService.start).toHaveBeenCalledWith('PATCH', '/api/projects/project-1', body);
    await act(async () => { expect(await result.current.complete('123456')).toEqual({ ok: true, value: { challengeId: 'challenge-1', body } }); });
    expect(stepUpService.verify).toHaveBeenCalledWith('challenge-1', '123456');
    expect(execute).toHaveBeenCalledWith('challenge-1', expect.objectContaining(body));
    expect(Object.isFrozen(execute.mock.calls[0][1])).toBe(true);
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.getItem('activeProfileId')).toBe('profile-1');
  });

  it('rejects query strings and discards a pending challenge after profile switch', async () => {
    const { result, rerender } = renderHook(() => useBoundStepUp<void>());
    await act(async () => { expect(await result.current.begin({ method: 'POST', path: '/api/cart/checkout/initialize?retry=true', body: {}, label: 'Checkout', execute: vi.fn() })).toBe(false); });
    expect(stepUpService.start).not.toHaveBeenCalled();
    await act(async () => { expect(await result.current.begin({ method: 'POST', path: '/api/cart/checkout/initialize', body: {}, label: 'Checkout', execute: vi.fn() })).toBe(true); });
    setProfile('profile-2');
    rerender();
    expect(result.current.challenge).toBeNull();
    expect(result.current.error).toContain('selected profile changed');
  });

  it('does not permit an expired challenge to be verified or reused', async () => {
    vi.mocked(stepUpService.start).mockResolvedValueOnce({ challengeId: 'expired', expiresAt: new Date(Date.now() - 1000).toISOString(), method: 'totp' });
    const execute = vi.fn();
    const { result } = renderHook(() => useBoundStepUp<void>());
    await act(async () => { expect(await result.current.begin({ method: 'POST', path: '/api/cart/checkout/initialize', body: {}, label: 'Checkout', execute })).toBe(false); });
    expect(result.current.challenge).toBeNull();
    expect(result.current.error).toContain('expired challenge');
    expect(await result.current.complete('123456')).toEqual({ ok: false, error: 'The server returned an expired challenge. Start the action again.' });
    expect(stepUpService.verify).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('keeps a challenge only for documented TOTP retry errors and never submits before verification', async () => {
    vi.mocked(stepUpService.verify).mockRejectedValueOnce(new ApiRequestError('Invalid code', { status: 403, code: 'AUTH_FACTOR_CODE_INVALID' }));
    const execute = vi.fn(async () => 'submitted');
    const { result } = renderHook(() => useBoundStepUp<string>());
    await act(async () => { await result.current.begin({ method: 'POST', path: '/api/cart/checkout/initialize', body: {}, label: 'Checkout', execute }); });
    await act(async () => { expect(await result.current.complete('111111')).toEqual({ ok: false, error: 'That authenticator code was not accepted. Enter the current code and try again.' }); });
    expect(execute).not.toHaveBeenCalled();
    expect(result.current.challenge?.challengeId).toBe('challenge-1');
    expect(result.current.error).toContain('authenticator code was not accepted');
    await act(async () => { expect(await result.current.complete('222222')).toEqual({ ok: true, value: 'submitted' }); });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('invalidates a pending challenge when the signed-in session changes', async () => {
    const { result, rerender } = renderHook(() => useBoundStepUp<void>());
    await act(async () => { expect(await result.current.begin({ method: 'POST', path: '/api/cart/checkout/initialize', body: {}, label: 'Checkout', execute: vi.fn() })).toBe(true); });
    localStorage.setItem('token', 'session-2');
    vi.mocked(useAuth).mockReturnValue({ activeProfile: { id: 'profile-1' }, token: 'session-2' } as ReturnType<typeof useAuth>);
    rerender();
    expect(result.current.challenge).toBeNull();
    expect(result.current.error).toContain('signed-in session changed');
    await act(async () => { expect(await result.current.complete('123456')).toMatchObject({ ok: false }); });
    expect(stepUpService.verify).not.toHaveBeenCalled();
  });
});
