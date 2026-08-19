import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { User } from '@/types';
import { authService, LoginPayload, RegisterPayload } from '@/services/authService';
import { isNetworkError } from '@/services/api';
import { setToken, clearToken } from '@/utils/tokenStorage';
import { db, clearLocalData } from '@/db';

const CURRENT_USER_KEY = 'currentUser';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  /** True once we know the current session is only backed by cached data —
   * i.e. we couldn't reach the server to confirm it's still valid. */
  isOfflineSession: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function cacheUser(user: User): Promise<void> {
  await db.meta.put({ key: CURRENT_USER_KEY, value: user });
}

async function getCachedUser(): Promise<User | undefined> {
  const entry = await db.meta.get(CURRENT_USER_KEY);
  return entry?.value as User | undefined;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineSession, setIsOfflineSession] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const loggedUser = await authService.me();
        if (!active) return;
        setUser(loggedUser);
        setIsOfflineSession(false);
        await cacheUser(loggedUser);
      } catch (err) {
        if (!active) return;

        if (isNetworkError(err)) {
          // Offline on boot: trust the last known session instead of
          // forcing a login the user has no way to complete right now.
          const cached = await getCachedUser();
          if (cached) {
            setUser(cached);
            setIsOfflineSession(true);
          } else {
            setUser(null);
          }
        } else {
          // A real 401: the session is genuinely invalid.
          setUser(null);
          await clearLocalData();
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const { user: loggedUser, token } = await authService.login(payload);
    if (token) await setToken(token);
    await cacheUser(loggedUser);
    setIsOfflineSession(false);
    setUser(loggedUser);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { user: newUser, token } = await authService.register(payload);
    if (token) await setToken(token);
    await cacheUser(newUser);
    setIsOfflineSession(false);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // If we're offline the server never finds out, but there's nothing
      // useful to do about that here — clearing local state below is what
      // actually matters for the "don't leak into the next account" goal.
    }
    await clearToken();
    await clearLocalData();
    setUser(null);
    setIsOfflineSession(false);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isOfflineSession, login, register, logout }),
    [user, isLoading, isOfflineSession, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider.');
  return ctx;
}
