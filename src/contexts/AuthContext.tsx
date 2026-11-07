/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authService, isLoginSecondFactorChallenge, type LoginSecondFactorChallenge, type RegisterResponse } from '../services/authService';
import { userService } from '../services/userService';
import { profileService, type AccountProfileSummary } from '../services/profileService';
import { adminAccessService, type AdminAccessProjection } from '../services/adminAccessService';
import type { LoginPayload, RegisterPayload, User } from '../types';
import { normalizeCachedUserDTO } from '../utils/normalizeUserDTO';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  profiles: AccountProfileSummary[];
  activeProfile: AccountProfileSummary | null;
  profileError: string | null;
  adminAccess: AdminAccessProjection | null;
  adminAccessNotAssigned: boolean;
  adminAccessLoading: boolean;
  adminAccessError: string | null;
  refreshAdminAccess: (profileId?: string) => Promise<AdminAccessProjection | null>;
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
    return normalizeCachedUserDTO(JSON.parse(value) as User);
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
  const [adminAccess, setAdminAccess] = useState<AdminAccessProjection | null>(null);
  const [adminAccessNotAssigned, setAdminAccessNotAssigned] = useState(false);
  const [adminAccessLoading, setAdminAccessLoading] = useState(false);
  const [adminAccessError, setAdminAccessError] = useState<string | null>(null);
  const [loginChallenge, setLoginChallenge] = useState<LoginSecondFactorChallenge | null>(null);
  const accessRequestVersion = useRef(0);
  const profileRequestVersion = useRef(0);
  const latestSession = useRef({ userId: user?._id ?? null, role: user?.role ?? null, token, profileId: activeProfile?.id ?? null });
  latestSession.current = { userId: user?._id ?? null, role: user?.role ?? null, token, profileId: activeProfile?.id ?? null };

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
    setAdminAccess(null);
    setAdminAccessNotAssigned(false);
    setAdminAccessError(null);
    setAdminAccessLoading(false);
    accessRequestVersion.current += 1;
    profileRequestVersion.current += 1;
    setLoginChallenge(null);
    setIsLoading(false);
  }, []);

  const persistSession = (nextUser: User, nextToken: string, nextAdminAccess?: AdminAccessProjection) => {
    window.dispatchEvent(new Event('realtiq:session-changed'));
    localStorage.removeItem('activeProfileId');
    if (nextUser.role === 'admin' && nextAdminAccess?.profileId) localStorage.setItem('activeProfileId', nextAdminAccess.profileId);
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
    setToken(nextToken);
    setAdminAccess(nextUser.role === 'admin' ? nextAdminAccess ?? null : null);
    setAdminAccessNotAssigned(Boolean(nextUser.role === 'admin' && nextAdminAccess && !nextAdminAccess.staffDepartments.length && !nextAdminAccess.capabilities.length));
    setAdminAccessError(null);
    setAdminAccessLoading(false);
    accessRequestVersion.current += 1;
    profileRequestVersion.current += 1;
    setProfiles([]);
    setActiveProfile(null);
    setLoginChallenge(null);
  };

  const refreshAdminAccess = useCallback(async (requestedProfileId?: string): Promise<AdminAccessProjection | null> => {
    const session = latestSession.current;
    if (!session.userId || session.role !== 'admin' || !session.token) {
      setAdminAccess(null);
      setAdminAccessNotAssigned(false);
      setAdminAccessError(null);
      setAdminAccessLoading(false);
      return null;
    }
    const profileId = requestedProfileId ?? session.profileId ?? localStorage.getItem('activeProfileId');
    if (!profileId) {
      setAdminAccess(null);
      setAdminAccessError('Select a current staff profile before opening the Admin Console.');
      return null;
    }
    const requestVersion = ++accessRequestVersion.current;
    // Remove the old projection while the server checks the current profile.
    // A permission failure must not leave stale department actions enabled.
    setAdminAccess(null);
    setAdminAccessLoading(true);
    setAdminAccessError(null);
    try {
      const nextAccess = await adminAccessService.get(profileId);
      const stillCurrent = requestVersion === accessRequestVersion.current &&
        latestSession.current.userId === session.userId && latestSession.current.token === session.token &&
        localStorage.getItem('token') === session.token && localStorage.getItem('activeProfileId') === profileId;
      if (!stillCurrent) return null;
      if (nextAccess.accountId !== session.userId || nextAccess.profileId !== profileId) {
        throw new Error('The server access projection does not match the current account and staff profile. Sign in again or select an authorized staff profile.');
      }
      setAdminAccess(nextAccess);
      setAdminAccessNotAssigned(!nextAccess.staffDepartments.length && !nextAccess.capabilities.length);
      setAdminAccessError(null);
      return nextAccess;
    } catch (raw) {
      if (requestVersion === accessRequestVersion.current && localStorage.getItem('activeProfileId') === profileId) {
        setAdminAccess(null);
        setAdminAccessError(raw instanceof Error ? raw.message : 'Current Admin Console access could not be verified. Sign in again or contact an Executive administrator.');
      }
      throw raw;
    } finally {
      if (requestVersion === accessRequestVersion.current) setAdminAccessLoading(false);
    }
  }, []);

  const updateUser = useCallback((nextUser: User) => {
    const previous = parseUser(localStorage.getItem('user'));
    if (previous?._id !== nextUser._id || previous?.role !== nextUser.role) {
      window.dispatchEvent(new Event('realtiq:session-changed'));
      setAdminAccess(null);
      setAdminAccessError(null);
      accessRequestVersion.current += 1;
    }
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const userId = user?._id;

  const refreshUser = useCallback(async (): Promise<User | null> => {
    if (!userId || !token) return null;
    const sessionToken = token;
    const refreshed = await userService.fetchUserById(userId);
    if (!refreshed || refreshed._id !== userId) return null;
    if (
      latestSession.current.userId !== userId || latestSession.current.token !== sessionToken ||
      localStorage.getItem('token') !== sessionToken
    ) return null;
    updateUser(refreshed);
    return refreshed;
  }, [token, updateUser, userId]);

  const refreshProfiles = useCallback(async () => {
    const requestVersion = ++profileRequestVersion.current;
    const session = latestSession.current;
    const selectedIdAtStart = localStorage.getItem('activeProfileId');
    const isCurrent = () => requestVersion === profileRequestVersion.current &&
      latestSession.current.userId === session.userId && latestSession.current.token === session.token &&
      localStorage.getItem('token') === session.token &&
      localStorage.getItem('activeProfileId') === selectedIdAtStart;
    if (!session.userId || !session.token) return;
    if (user?.role !== 'admin') {
      await authService.account();
      if (!isCurrent()) return;
      await refreshUser();
      if (!isCurrent()) return;
    }
    const result = await profileService.list();
    if (!isCurrent()) return;
    const selectedId = selectedIdAtStart;
    const selected = user?.role === 'admin'
      ? result.profiles.find((profile) => profile.id === selectedId && profile.kind === 'staff')
      : result.profiles.find((profile) => profile.id === selectedId) ?? result.profiles[0];
    if (!selected) {
      if (!isCurrent()) return;
      setProfiles([]);
      setActiveProfile(null);
      setAdminAccess(null);
      setProfileError(user?.role === 'admin' ? 'No active staff profile is available for this account. Contact an authorized Executive administrator.' : 'No authorized profile is available for this account.');
      return;
    }
    const current = await profileService.current(selected.id);
    if (!isCurrent()) return;
    localStorage.setItem('activeProfileId', selected.id);
    setProfiles(result.profiles);
    setActiveProfile(current.profile);
    setProfileError(null);
    if (user?.role === 'admin') await refreshAdminAccess(selected.id);
  }, [refreshAdminAccess, refreshUser, user?.role]);

  const switchProfile = useCallback(async (id: string) => {
    const requestVersion = ++profileRequestVersion.current;
    const session = latestSession.current;
    const selectedIdAtStart = localStorage.getItem('activeProfileId');
    const isCurrent = () => requestVersion === profileRequestVersion.current &&
      latestSession.current.userId === session.userId && latestSession.current.token === session.token &&
      localStorage.getItem('token') === session.token &&
      localStorage.getItem('activeProfileId') === selectedIdAtStart;
    if (!session.userId || !session.token) throw new Error('Sign in again before switching profiles.');
    if (user?.role === 'admin') {
      const selectedStaffProfile = localStorage.getItem('activeProfileId');
      if (id !== selectedStaffProfile) throw new Error('Admin staff-profile switching is disabled. Continue with the current assigned staff profile.');
    }
    if (user?.role !== 'admin') {
      await authService.account();
      if (!isCurrent()) throw new Error('The session or selected profile changed. Refresh your profile list before continuing.');
      await refreshUser();
      if (!isCurrent()) throw new Error('The session or selected profile changed. Refresh your profile list before continuing.');
    }
    const result = await profileService.list();
    if (!isCurrent()) throw new Error('The session or selected profile changed. Refresh your profile list before continuing.');
    const selected = result.profiles.find((profile) => profile.id === id);
    if (!selected) throw new Error('This profile is no longer available to this account. Refresh your profile list and try again.');
    if (user?.role === 'admin' && selected.kind !== 'staff') throw new Error('The Admin Console must use an authorized staff profile.');
    const current = await profileService.current(id);
    if (!isCurrent()) throw new Error('The session or selected profile changed. Refresh your profile list before continuing.');
    window.dispatchEvent(new Event('realtiq:session-changed'));
    localStorage.setItem('activeProfileId', id);
    setProfiles(result.profiles);
    setActiveProfile(current.profile);
    setProfileError(null);
    if (user?.role === 'admin') await refreshAdminAccess(id);
  }, [refreshAdminAccess, refreshUser, user?.role]);

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
      persistSession(response.user, response.token, response.adminAccess);
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
      persistSession(response.user, response.token, response.adminAccess);
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
    const refreshAfterPermissionError = () => {
      if (latestSession.current.role === 'admin') void refreshAdminAccess().catch(() => undefined);
    };
    window.addEventListener('realtiq:admin-access-refresh', refreshAfterPermissionError);
    return () => window.removeEventListener('realtiq:admin-access-refresh', refreshAfterPermissionError);
  }, [refreshAdminAccess]);

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
      adminAccess,
      adminAccessNotAssigned,
      adminAccessLoading,
      adminAccessError,
      refreshAdminAccess,
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
    [user, token, isLoading, profiles, activeProfile, profileError, adminAccess, adminAccessNotAssigned, adminAccessLoading, adminAccessError, refreshAdminAccess, refreshProfiles, switchProfile, login, loginChallenge, completeLoginSecondFactor, cancelLoginChallenge, register, updateUser, refreshUser, logout],
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
