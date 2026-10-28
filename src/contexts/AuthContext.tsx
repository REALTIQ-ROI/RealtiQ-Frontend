/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService, isLoginSecondFactorChallenge, type LoginSecondFactorChallenge, type RegisterResponse } from '../services/authService';
import { userService } from '../services/userService';
import { profileService, type AccountProfileSummary } from '../services/profileService';
import type { LoginPayload, RegisterPayload, User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  profiles: AccountProfileSummary[];
  activeProfile: AccountProfileSummary | null;
  profileError: string | null;
  refreshProfiles: () => Promise<void>;
  switchProfile: (id: string) => Promise<void>;
  login: (payload: LoginPayload) => Promise<User | null>;
  loginChallenge: LoginSecondFactorChallenge | null;
  completeLoginSecondFactor: (code: string) => Promise<User>;
  cancelLoginChallenge: () => void;
  register: (payload: RegisterPayload) => Promise<RegisterResponse>;
  updateUser: (nextUser: User) => void;
  refreshUser: () => Promise<User | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const parseUser = (value: string | null): User | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as User;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => parseUser(localStorage.getItem('user')));
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem('token') && parseUser(localStorage.getItem('user'))));
  const [profiles, setProfiles] = useState<AccountProfileSummary[]>([]);
  const [activeProfile, setActiveProfile] = useState<AccountProfileSummary | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loginChallenge, setLoginChallenge] = useState<LoginSecondFactorChallenge | null>(null);

  const clearSession = useCallback(() => {
    window.dispatchEvent(new Event('realtiq:session-changed'));
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeProfileId');
    setUser(null);
    setToken(null);
    setProfiles([]);
    setActiveProfile(null);
    setProfileError(null);
    setLoginChallenge(null);
    setIsLoading(false);
  }, []);

  const persistSession = (nextUser: User, nextToken: string) => {
    window.dispatchEvent(new Event('realtiq:session-changed'));
    localStorage.removeItem('activeProfileId');
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
    setToken(nextToken);
    setProfiles([]);
    setActiveProfile(null);
    setLoginChallenge(null);
  };

  const refreshProfiles = useCallback(async () => {
    await authService.account();
    const result = await profileService.list();
    const selectedId = localStorage.getItem('activeProfileId');
    const selected = result.profiles.find((profile) => profile.id === selectedId) ?? result.profiles[0];
    if (!selected) {
      setProfiles([]);
      setActiveProfile(null);
      setProfileError('No authorized profile is available for this account.');
      return;
    }
    const current = await profileService.current(selected.id);
    localStorage.setItem('activeProfileId', selected.id);
    setProfiles(result.profiles);
    setActiveProfile(current.profile);
    setProfileError(null);
  }, []);

  const switchProfile = useCallback(async (id: string) => {
    await authService.account();
    const result = await profileService.list();
    const selected = result.profiles.find((profile) => profile.id === id);
    if (!selected) throw new Error('This profile is no longer available to this account. Refresh your profile list and try again.');
    const current = await profileService.current(id);
    window.dispatchEvent(new Event('realtiq:session-changed'));
    localStorage.setItem('activeProfileId', id);
    setProfiles(result.profiles);
    setActiveProfile(current.profile);
    setProfileError(null);
  }, []);

  const updateUser = useCallback((nextUser: User) => {
    const previous = parseUser(localStorage.getItem('user'));
    if (previous?._id !== nextUser._id || previous?.role !== nextUser.role) window.dispatchEvent(new Event('realtiq:session-changed'));
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const userId = user?._id;

  const refreshUser = useCallback(async (): Promise<User | null> => {
    if (!userId) {
      return null;
    }

    const refreshed = await userService.fetchUserById(userId);
    updateUser(refreshed);
    return refreshed;
  }, [updateUser, userId]);

  const login = useCallback(async (payload: LoginPayload): Promise<User | null> => {
    setLoginChallenge(null);
    setIsLoading(true);
    try {
      const response = await authService.login(payload);
      if (isLoginSecondFactorChallenge(response)) {
        setLoginChallenge(response);
        setIsLoading(false);
        return null;
      }
      persistSession(response.user, response.token);
      return response.user;
    } catch (error) {
      setIsLoading(false);
      throw error instanceof Error ? error : new Error('Unable to login.');
    }
  }, []);

  const completeLoginSecondFactor = useCallback(async (code: string): Promise<User> => {
    const challenge = loginChallenge;
    if (!challenge) throw new Error('There is no active sign-in verification challenge. Start sign-in again.');
    if (Date.parse(challenge.expiresAt) <= Date.now()) {
      setLoginChallenge(null);
      throw new Error('This sign-in verification challenge has expired. Start sign-in again.');
    }

    setIsLoading(true);
    try {
      const response = await authService.completeLoginSecondFactor(challenge.challengeId, code);
      persistSession(response.user, response.token);
      return response.user;
    } catch (error) {
      setIsLoading(false);
      throw error instanceof Error ? error : new Error('Unable to verify the authenticator code.');
    }
  }, [loginChallenge]);

  const cancelLoginChallenge = useCallback(() => {
    setLoginChallenge(null);
    setIsLoading(false);
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<RegisterResponse> => {
    setIsLoading(true);
    try {
      const response = await authService.register(payload);
      if (response.token) {
        persistSession(response.user, response.token);
      } else {
        setIsLoading(false);
      }
      return response;
    } catch (error) {
      setIsLoading(false);
      const message = error instanceof Error ? error.message : 'Unable to register.';
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(() => {
    if (token) void authService.logout(token).catch(() => undefined);
    clearSession();
  }, [token, clearSession]);

  useEffect(() => {
    window.addEventListener('realtiq:session-expired', clearSession);
    return () => window.removeEventListener('realtiq:session-expired', clearSession);
  }, [clearSession]);

  useEffect(() => {
    if (!token || !userId) return;
    let current = true;
    queueMicrotask(() => {
      if (!current) return;
      setIsLoading(true);
      void refreshProfiles().catch((error: unknown) => {
        if (current && localStorage.getItem('token')) setProfileError(error instanceof Error ? error.message : 'Unable to load your current profile.');
      }).finally(() => {
        if (current) setIsLoading(false);
      });
    });
    return () => { current = false; };
  }, [token, userId, refreshProfiles]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token && activeProfile),
      isLoading,
      profiles,
      activeProfile,
      profileError,
      refreshProfiles,
      switchProfile,
      login,
      loginChallenge,
      completeLoginSecondFactor,
      cancelLoginChallenge,
      register,
      updateUser,
      refreshUser,
      logout,
    }),
    [user, token, isLoading, profiles, activeProfile, profileError, refreshProfiles, switchProfile, login, loginChallenge, completeLoginSecondFactor, cancelLoginChallenge, register, updateUser, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
