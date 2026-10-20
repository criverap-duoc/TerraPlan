import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  UNAUTHORIZED_EVENT,
  clearTokens,
  getStoredTokens,
  saveTokens,
} from '@/lib/token-storage';

import { loginRequest, meRequest } from './api';
import type { User } from './types';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      const tokens = getStoredTokens();
      if (!tokens) {
        setIsLoading(false);
        return;
      }

      setAccessToken(tokens.accessToken);
      try {
        const profile = await meRequest();
        if (isActive) {
          setUser(profile);
        }
      } catch {
        // Expired or revoked session: drop it instead of rendering a half-signed-in shell.
        clearTokens();
        if (isActive) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setAccessToken(null);
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await loginRequest(email, password);
    saveTokens(tokens);
    setAccessToken(tokens.accessToken);
    const profile = await meRequest();
    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setAccessToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, accessToken, isLoading, login, logout }),
    [user, accessToken, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
