/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import type { LoginPayload, RegisterPayload, User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(false);

  const persistSession = (nextUser: User, nextToken: string) => {
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
    setToken(nextToken);
  };

  const updateUser = useCallback((nextUser: User) => {
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    if (!user?._id) {
      return null;
    }

    const refreshed = await userService.fetchUserById(user._id);
    updateUser(refreshed);
    return refreshed;
  }, [updateUser, user?._id]);

  const login = useCallback(async (payload: LoginPayload): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await authService.login(payload);
      persistSession(response.user, response.token);
      return response.user;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to login.';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authService.register(payload);
      if (response.token) {
        persistSession(response.user, response.token);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to register.';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  useEffect(() => {
    const expire = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
    };
    window.addEventListener('realtiq:session-expired', expire);
    return () => window.removeEventListener('realtiq:session-expired', expire);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      register,
      updateUser,
      refreshUser,
      logout,
    }),
    [user, token, isLoading, login, register, updateUser, refreshUser],
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
