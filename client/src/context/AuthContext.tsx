import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { User } from '@/types';
import {
  authService,
  LoginPayload,
  MailSentResponse,
  RegisterPayload,
  RequestRegisterCodePayload,
} from '@/services/authService';
import { isNetworkError } from '@/services/api';
import { billingService } from '@/services/billingService';
import { AccessInfo } from '@/types';
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
  /** Step 1 of sign-up: e-mails the confirmation code. */
  requestRegisterCode: (payload: RequestRegisterCodePayload) => Promise<MailSentResponse>;
  /** Step 2: creates the account once the code checks out. */
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-reads the plan from the server (after a payment, for instance). */
  refreshAccess: () => Promise<AccessInfo | undefined>;
  /** Applies plan info the server just returned (checkout confirmation). */
  applyAccess: (access: AccessInfo) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function cacheUser(user: User): Promise<void> {
  await db.meta.put({ key: CURRENT_USER_KEY, value: user });
}

async function getCachedUser(): Promise<User | undefined> {
  const entry = await db.meta.get(CURRENT_USER_KEY);
  return entry?.value as User | undefined;
}

/** A different account on the same browser must start from an empty local
 * database — nothing of the previous person's may be shown or synced up. */
async function adoptSession(user: User): Promise<void> {
  const cached = await getCachedUser();
  if (cached && cached.id !== user.id) await clearLocalData();
  await cacheUser(user);
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
        await adoptSession(loggedUser);
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
    await adoptSession(loggedUser);
    setIsOfflineSession(false);
    setUser(loggedUser);
  }, []);

  const requestRegisterCode = useCallback(
    (payload: RequestRegisterCodePayload) => authService.requestRegisterCode(payload),
    []
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    const { user: newUser, token } = await authService.register(payload);
    if (token) await setToken(token);
    await adoptSession(newUser);
    setIsOfflineSession(false);
    setUser(newUser);
  }, []);

  const applyAccess = useCallback((access: AccessInfo) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, access };
      cacheUser(next);
      return next;
    });
  }, []);

  const refreshAccess = useCallback(async () => {
    try {
      const access = await billingService.status();
      applyAccess(access);
      return access;
    } catch {
      return undefined;
    }
  }, [applyAccess]);

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
    () => ({ user, isLoading, isOfflineSession, login, requestRegisterCode, register, logout, refreshAccess, applyAccess }),
    [user, isLoading, isOfflineSession, login, requestRegisterCode, register, logout, refreshAccess, applyAccess]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider.');
  return ctx;
}
