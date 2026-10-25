import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '../services/authService';
import { profileService, type AccountProfileSummary } from '../services/profileService';
import type { User } from '../types';

vi.mock('../services/authService', () => ({ authService: { account: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() } }));
vi.mock('../services/profileService', () => ({ profileService: { list: vi.fn(), current: vi.fn() } }));
vi.mock('../services/userService', () => ({ userService: { fetchUserById: vi.fn() } }));

const account: User = { _id: 'identity-1', name: 'Alex User', email: 'alex@example.test', role: 'buyer' };
const profiles: AccountProfileSummary[] = [
  { id: 'profile-1', kind: 'buyer', structure: 'individual', name: 'Alex', status: 'active', version: 1, permissions: [] },
  { id: 'profile-2', kind: 'buyer', structure: 'company', name: 'Alex Holdings', status: 'active', version: 2, permissions: ['team.manage'] },
];
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthProvider account and profile lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(authService.account).mockResolvedValue({});
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    vi.mocked(profileService.list).mockResolvedValue({ profiles, nextCursor: null });
    vi.mocked(profileService.current).mockImplementation(async (id) => ({ profile: profiles.find((profile) => profile.id === id)! }));
  });

  it('restores a session by loading account, authorized profiles and the selected profile', async () => {
    localStorage.setItem('token', 'session-token');
    localStorage.setItem('user', JSON.stringify(account));
    localStorage.setItem('activeProfileId', 'profile-2');
    const calls: string[] = [];
    vi.mocked(authService.account).mockImplementation(async () => { calls.push('account'); return {}; });
    vi.mocked(profileService.list).mockImplementation(async () => { calls.push('profiles'); return { profiles, nextCursor: null }; });
    vi.mocked(profileService.current).mockImplementation(async (id) => { calls.push(`current:${id}`); return { profile: profiles.find((profile) => profile.id === id)! }; });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.activeProfile?.id).toBe('profile-2');
    expect(calls.slice(0, 3)).toEqual(['account', 'profiles', 'current:profile-2']);
  });

  it('revalidates authorization and refreshes current profile data before switching', async () => {
    localStorage.setItem('token', 'session-token');
    localStorage.setItem('user', JSON.stringify(account));
    localStorage.setItem('activeProfileId', 'profile-1');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.activeProfile?.id).toBe('profile-1'));

    await act(async () => { await result.current.switchProfile('profile-2'); });
    expect(authService.account).toHaveBeenCalledTimes(2);
    expect(profileService.list).toHaveBeenCalledTimes(2);
    expect(profileService.current).toHaveBeenLastCalledWith('profile-2');
    expect(localStorage.getItem('activeProfileId')).toBe('profile-2');
    expect(result.current.activeProfile?.id).toBe('profile-2');
  });

  it('does not change selected profile when membership disappeared before switching', async () => {
    localStorage.setItem('token', 'session-token');
    localStorage.setItem('user', JSON.stringify(account));
    localStorage.setItem('activeProfileId', 'profile-1');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.activeProfile?.id).toBe('profile-1'));
    vi.mocked(profileService.list).mockResolvedValueOnce({ profiles: [profiles[0]], nextCursor: null });

    await expect(result.current.switchProfile('profile-2')).rejects.toThrow('no longer available');
    expect(localStorage.getItem('activeProfileId')).toBe('profile-1');
    expect(result.current.activeProfile?.id).toBe('profile-1');
    expect(profileService.current).toHaveBeenCalledTimes(1);
  });

  it('clears session and active profile state immediately on logout', async () => {
    localStorage.setItem('token', 'session-token');
    localStorage.setItem('user', JSON.stringify(account));
    localStorage.setItem('activeProfileId', 'profile-1');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.activeProfile?.id).toBe('profile-1'));

    act(() => result.current.logout());
    expect(authService.logout).toHaveBeenCalledWith('session-token');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('activeProfileId')).toBeNull();
    expect(result.current.activeProfile).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
