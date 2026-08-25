import axios from 'axios';
import { db, OutboxEntry } from './schema';
import { clientRepository } from '@/repositories/clientRepository';
import { taskRepository } from '@/repositories/taskRepository';
import { financeRepository } from '@/repositories/financeRepository';
import { goalRepository } from '@/repositories/goalRepository';
import { clientService, ClientCreatePayload, ClientUpdatePayload } from '@/services/clientService';
import { taskService, TaskCreatePayload, TaskUpdatePayload } from '@/services/taskService';
import { financeService, FinanceCreatePayload, FinanceUpdatePayload } from '@/services/financeService';
import {
  goalService,
  GoalCreatePayload,
  GoalUpdatePayload,
  GoalContributionCreatePayload,
  GoalContributionUpdatePayload,
} from '@/services/goalService';
import { isOnline, subscribeConnectivity } from '@/utils/connectivity';
import { EntityStatus } from '@/types';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
  lastError: string | null;
}

let status: SyncStatus = {
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
};

const listeners = new Set<(status: SyncStatus) => void>();

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((listener) => listener(status));
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

async function refreshPendingCount() {
  setStatus({ pendingCount: await db.outbox.count() });
}

const MAX_ATTEMPTS = 5;

function isNetworkError(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response;
}

function isNotFound(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404;
}

type PushOutcome = { kind: 'ok' } | { kind: 'offline' } | { kind: 'failed'; message: string };

async function pushEntry(entry: OutboxEntry): Promise<PushOutcome> {
  try {
    if (entry.entity === 'client') {
      if (entry.type === 'create') {
        const result = await clientService.create(entry.payload as unknown as ClientCreatePayload);
        await clientRepository.replaceLocal(result);
      } else if (entry.type === 'update') {
        const result = await clientService.update(entry.entityId, entry.payload as unknown as ClientUpdatePayload);
        await clientRepository.replaceLocal(result);
      } else if (entry.type === 'status') {
        const payload = entry.payload as { status: EntityStatus; updatedAt: string; completedAt?: string };
        const result = await clientService.updateStatus(entry.entityId, payload.status, payload.updatedAt, payload.completedAt);
        await clientRepository.replaceLocal(result);
      } else if (entry.type === 'delete') {
        const payload = entry.payload as { tasksAction?: 'unlink' | 'delete' } | undefined;
        await clientService.remove(entry.entityId, payload?.tasksAction);
      }
    } else if (entry.entity === 'task') {
      if (entry.type === 'create') {
        const result = await taskService.create(entry.payload as unknown as TaskCreatePayload);
        await taskRepository.replaceLocal(result);
      } else if (entry.type === 'update') {
        const result = await taskService.update(entry.entityId, entry.payload as unknown as TaskUpdatePayload);
        await taskRepository.replaceLocal(result);
      } else if (entry.type === 'status') {
        const payload = entry.payload as { status: EntityStatus; updatedAt: string; completedAt?: string };
        const result = await taskService.updateStatus(entry.entityId, payload.status, payload.updatedAt, payload.completedAt);
        await taskRepository.replaceLocal(result);
      } else if (entry.type === 'delete') {
        await taskService.remove(entry.entityId);
      }
    } else if (entry.entity === 'finance') {
      // Finance entries have no separate 'status' op — the "já foi pago"
      // toggle is just an update, so there are only three cases here.
      if (entry.type === 'create') {
        const result = await financeService.create(entry.payload as unknown as FinanceCreatePayload);
        await financeRepository.replaceLocal(result);
      } else if (entry.type === 'update') {
        const result = await financeService.update(
          entry.entityId,
          entry.payload as unknown as FinanceUpdatePayload
        );
        await financeRepository.replaceLocal(result);
      } else if (entry.type === 'delete') {
        await financeService.remove(entry.entityId);
      }
    } else if (entry.entity === 'goal') {
      if (entry.type === 'create') {
        const result = await goalService.create(entry.payload as unknown as GoalCreatePayload);
        await goalRepository.replaceGoalLocal(result);
      } else if (entry.type === 'update') {
        const result = await goalService.update(
          entry.entityId,
          entry.payload as unknown as GoalUpdatePayload
        );
        await goalRepository.replaceGoalLocal(result);
      } else if (entry.type === 'delete') {
        await goalService.remove(entry.entityId);
      }
    } else {
      // A deposit. It's its own record, so it pushes independently of its
      // goal — that's what keeps two offline devices from losing one of them.
      if (entry.type === 'create') {
        const result = await goalService.createContribution(
          entry.payload as unknown as GoalContributionCreatePayload
        );
        await goalRepository.replaceContributionLocal(result);
      } else if (entry.type === 'update') {
        const result = await goalService.updateContribution(
          entry.entityId,
          entry.payload as unknown as GoalContributionUpdatePayload
        );
        await goalRepository.replaceContributionLocal(result);
      } else if (entry.type === 'delete') {
        await goalService.removeContribution(entry.entityId);
      }
    }
    return { kind: 'ok' };
  } catch (err) {
    if (isNetworkError(err)) return { kind: 'offline' };
    // 404 on update/delete just means the other side of a cascade already
    // handled it server-side (e.g. deleting a client also deletes its
    // tasks) — treat as done, not a failure.
    if (isNotFound(err) && entry.type !== 'create') return { kind: 'ok' };
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    // eslint-disable-next-line no-console
    console.warn('[sync] push failed', entry, err);
    return { kind: 'failed', message };
  }
}

async function pushOutbox(): Promise<void> {
  const entries = await db.outbox.orderBy('seq').toArray();

  for (const entry of entries) {
    const outcome = await pushEntry(entry);

    if (outcome.kind === 'offline') break;

    if (outcome.kind === 'ok') {
      await db.outbox.delete(entry.seq!);
      continue;
    }

    // A real (non-network) error. Retry a few times in case it's transient,
    // then give up so one bad entry can't block sync forever — other
    // entities have no ordering dependency on this one since references are
    // plain client-generated ids, not server foreign keys.
    const attempts = entry.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await db.outbox.delete(entry.seq!);
    } else {
      await db.outbox.update(entry.seq!, { attempts, lastError: outcome.message });
    }
  }

  await refreshPendingCount();
}

async function pullRemote(): Promise<void> {
  const [serverClients, serverTasks, serverFinance, serverGoals] = await Promise.all([
    clientService.list(),
    taskService.list(),
    financeService.list(),
    goalService.list(),
  ]);

  for (const client of serverClients) {
    await clientRepository.upsertFromServer(client);
  }
  for (const task of serverTasks) {
    await taskRepository.upsertFromServer(task);
  }
  for (const entry of serverFinance) {
    await financeRepository.upsertFromServer(entry);
  }
  for (const goal of serverGoals.goals) {
    await goalRepository.upsertGoalFromServer(goal);
  }
  for (const contribution of serverGoals.contributions) {
    await goalRepository.upsertContributionFromServer(contribution);
  }

  // Anything local that's fully synced (no pending outbox entry) but missing
  // from the server was deleted elsewhere — mirror that locally too.
  const [
    localClientIds,
    localTaskIds,
    localFinanceIds,
    localGoalIds,
    localContributionIds,
    outboxEntries,
  ] = await Promise.all([
    clientRepository.getAllLocalIds(),
    taskRepository.getAllLocalIds(),
    financeRepository.getAllLocalIds(),
    goalRepository.getAllGoalIds(),
    goalRepository.getAllContributionIds(),
    db.outbox.toArray(),
  ]);
  const pendingIds = new Set(outboxEntries.map((e) => e.entityId));

  const serverClientIds = new Set(serverClients.map((c) => c.id));
  for (const id of localClientIds) {
    if (!serverClientIds.has(id) && !pendingIds.has(id)) {
      await clientRepository.removeLocalOnly(id);
    }
  }

  const serverTaskIds = new Set(serverTasks.map((t) => t.id));
  for (const id of localTaskIds) {
    if (!serverTaskIds.has(id) && !pendingIds.has(id)) {
      await taskRepository.removeLocalOnly(id);
    }
  }

  const serverFinanceIds = new Set(serverFinance.map((e) => e.id));
  for (const id of localFinanceIds) {
    if (!serverFinanceIds.has(id) && !pendingIds.has(id)) {
      await financeRepository.removeLocalOnly(id);
    }
  }

  const serverGoalIds = new Set(serverGoals.goals.map((g) => g.id));
  for (const id of localGoalIds) {
    if (!serverGoalIds.has(id) && !pendingIds.has(id)) {
      await goalRepository.removeGoalLocalOnly(id);
    }
  }

  const serverContributionIds = new Set(serverGoals.contributions.map((c) => c.id));
  for (const id of localContributionIds) {
    if (!serverContributionIds.has(id) && !pendingIds.has(id)) {
      await goalRepository.removeContributionLocalOnly(id);
    }
  }
}

let syncing = false;

export async function runSync(): Promise<void> {
  if (syncing) return;
  const online = await isOnline();
  setStatus({ isOnline: online });
  if (!online) return;

  syncing = true;
  setStatus({ isSyncing: true, lastError: null });
  try {
    await pushOutbox();
    await pullRemote();
    setStatus({ lastSyncedAt: Date.now() });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[sync] cycle failed', err);
    setStatus({ lastError: err instanceof Error ? err.message : 'Falha ao sincronizar.' });
  } finally {
    syncing = false;
    setStatus({ isSyncing: false });
    await refreshPendingCount();
  }
}

const SYNC_INTERVAL_MS = 2 * 60 * 1000;
let started = false;

export function startSyncEngine(): void {
  if (started) return;
  started = true;

  refreshPendingCount();

  subscribeConnectivity((online) => {
    setStatus({ isOnline: online });
    if (online) runSync();
  });

  setInterval(runSync, SYNC_INTERVAL_MS);
  runSync();
}
