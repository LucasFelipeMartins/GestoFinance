import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { startSyncEngine, subscribeSyncStatus, runSync, SyncStatus } from '@/db/sync';
import { useAuth } from './AuthContext';

interface SyncContextValue extends SyncStatus {
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

const initialStatus: SyncStatus = {
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
};

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus>(initialStatus);
  const queryClient = useQueryClient();
  const lastSyncedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((next) => {
      setStatus(next);
      // A sync cycle just finished and may have pulled in changes made
      // elsewhere (or confirmed pushes) — the UI only reads from React
      // Query's cache, so it needs telling to re-read from Dexie.
      if (next.lastSyncedAt && next.lastSyncedAt !== lastSyncedAtRef.current) {
        lastSyncedAtRef.current = next.lastSyncedAt;
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    });
    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    if (user) startSyncEngine();
  }, [user]);

  const value: SyncContextValue = { ...status, syncNow: runSync };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync deve ser usado dentro de um SyncProvider.');
  return ctx;
}
