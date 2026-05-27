import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ROUTES } from '../lib/constants';
import { requestLogoutBestEffort } from '../features/auth/logout';
import { onUnauthorized } from '../lib/http/onUnauthorized';
import {
  clearSession,
  loadStoredSession,
  setSession,
} from '../lib/session/sessionStore';

import type { User } from '../types/user';

/** Sesión sintética para desarrollo cuando el backend aún no está conectado (no se usa en prod). */
export const MOCK_TOKEN = 'fake-jwt-token-desarrollo' as const;

export const MOCK_USER: User = {
  id: 'mock-123',
  email: 'ehizer@outletgo.com',
  role: 'SELLER',
  name: 'Ehizer Valero',
  storeId: 'tienda-avellaneda-1',
  avatarUrl: null,
  isActive: true,
};

function getInitialAuthState(): { token: string | null; user: User | null } {
  const stored = loadStoredSession();

  if (!import.meta.env.DEV) {
    return stored;
  }

  /** Sesión real persistida → no pisar el mock. */
  if (stored.token && stored.user) {
    return stored;
  }

  console.warn('⚠️ MOCK AUTH ACTIVADO: Logueado automáticamente como SELLER');

  /** Misma rutina que login real: localStorage visible para `apiClient` Bearer. */
  setSession(MOCK_TOKEN, MOCK_USER);

  return { token: MOCK_TOKEN, user: MOCK_USER };
}

export type AuthContextValue = {
  token: string | null;
  user: User | null;
  /** Sesión válida para usar el panel (token + usuario activo según briefing). */
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  /** Cierra sesión localmente y redirige a `/login`; intenta POST logout antes de borrar el token. */
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [{ token, user }, setAuth] = useState(getInitialAuthState);

  const clearSessionAndRedirectToLogin = useCallback(() => {
    clearSession();
    setAuth({ token: null, user: null });
    window.location.assign(ROUTES.login);
  }, []);

  const login = useCallback((nextToken: string, nextUser: User) => {
    setSession(nextToken, nextUser);
    setAuth({ token: nextToken, user: nextUser });
  }, []);

  const logout = useCallback(async () => {
    await requestLogoutBestEffort();
    clearSessionAndRedirectToLogin();
  }, [clearSessionAndRedirectToLogin]);

  useEffect(() => {
    return onUnauthorized(clearSessionAndRedirectToLogin);
  }, [clearSessionAndRedirectToLogin]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user && user.isActive),
      login,
      logout,
    }),
    [token, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
