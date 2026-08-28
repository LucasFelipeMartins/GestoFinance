import { db, LocalTask, LocalClient } from '@/db/schema';
import { enqueueOutbox, cancelPendingCreate } from '@/db/outbox';
import { Task, TaskWithClient, TaskClientRef, Priority, EntityStatus } from '@/types';
import { TaskListParams, TaskCreatePayload } from '@/services/taskService';
import { defaultTaskSort } from '@/utils/taskSort';
import { isExpiredCompletedTask } from '@/utils/formatters';

function toTask(row: LocalTask): Task {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    dueDate: row.dueDate?.toISOString(),
  };
}

function toLocalTask(task: Task): LocalTask {
  return {
    ...task,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
    completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
  };
}

function toClientRef(row: LocalClient): TaskClientRef {
  return { id: row.id, name: row.name, avatarUrl: row.avatarUrl, initials: row.initials };
}

async function attachClients(tasks: Task[]): Promise<TaskWithClient[]> {
  const ids = [...new Set(tasks.map((t) => t.clientId).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return tasks;

  const clients = await db.clients.bulkGet(ids);
  const byId = new Map(clients.filter((c): c is LocalClient => Boolean(c)).map((c) => [c.id, toClientRef(c)]));

  return tasks.map((task) => ({ ...task, client: task.clientId ? byId.get(task.clientId) : undefined }));
}

export interface TaskFormInput {
  title: string;
  description?: string;
  clientId?: string;
  dueDate?: string;
  priority: Priority;
  status?: EntityStatus;
  reminderEnabled?: boolean;
}

async function list(params: TaskListParams = {}): Promise<TaskWithClient[]> {
  let rows = await db.tasks.toArray();

  // Completed tasks past their 24h stay are already on their way out (see
  // purgeExpiredCompleted, which runs on the sync cycle). Dropping them here
  // too means the list never shows one in the window between expiring and
  // the next purge pass.
  rows = rows.filter((r) => !isExpiredCompletedTask(r));

  if (params.status) rows = rows.filter((r) => r.status === params.status);
  if (params.priority) rows = rows.filter((r) => r.priority === params.priority);
  if (params.clientId) rows = rows.filter((r) => r.clientId === params.clientId);
  if (params.search) {
    const term = params.search.trim().toLowerCase();
    rows = rows.filter(
      (r) => r.title.toLowerCase().includes(term) || (r.description ?? '').toLowerCase().includes(term)
    );
  }

  let tasks = rows.map(toTask);

  if (params.sort) {
    const order = params.order === 'asc' ? 1 : -1;
    tasks = [...tasks].sort((a, b) => {
      const av = a[params.sort as keyof Task];
      const bv = b[params.sort as keyof Task];
      if (av === bv) return 0;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      return av > bv ? order : -order;
    });
  } else {
    tasks = [...tasks].sort(defaultTaskSort);
  }

  return attachClients(tasks);
}

async function get(id: string): Promise<TaskWithClient | undefined> {
  const row = await db.tasks.get(id);
  if (!row) return undefined;
  const [withClient] = await attachClients([toTask(row)]);
  return withClient;
}

async function create(input: TaskFormInput): Promise<TaskWithClient> {
  const now = new Date();
  const status = input.status ?? 'pending';
  const row: LocalTask = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    clientId: input.clientId || undefined,
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    priority: input.priority,
    status,
    reminderEnabled: input.reminderEnabled ?? false,
    createdAt: now,
    updatedAt: now,
    // A task filed as already done starts its 24h retention right away —
    // completedAt has to be set wherever status becomes 'completed', not
    // only in updateStatus, or the row would never age out.
    completedAt: status === 'completed' ? now : undefined,
  };

  await db.tasks.put(row);

  const payload: TaskCreatePayload = {
    localId: row.id,
    title: row.title,
    description: row.description,
    clientId: row.clientId,
    dueDate: row.dueDate?.toISOString(),
    priority: row.priority,
    status: row.status,
    reminderEnabled: row.reminderEnabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
  };
  await enqueueOutbox('task', row.id, 'create', payload);

  const [withClient] = await attachClients([toTask(row)]);
  return withClient;
}

async function update(id: string, input: Partial<TaskFormInput>): Promise<TaskWithClient> {
  const existing = await db.tasks.get(id);
  if (!existing) throw new Error('Tarefa não encontrada localmente.');

  const now = new Date();
  const status = input.status ?? existing.status;
  const row: LocalTask = {
    ...existing,
    ...input,
    dueDate: input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : undefined) : existing.dueDate,
    clientId: 'clientId' in input ? input.clientId || undefined : existing.clientId,
    updatedAt: now,
    // The edit form can flip status just as the checkbox does, so keep the
    // completion stamp in step here too — it is what the 24h retention
    // counts from. Re-completing an already-done task keeps the original
    // stamp rather than restarting the clock.
    completedAt: status === 'completed' ? existing.completedAt ?? now : undefined,
  };

  await db.tasks.put(row);
  await enqueueOutbox('task', id, 'update', {
    title: row.title,
    description: row.description,
    clientId: row.clientId ?? '',
    dueDate: row.dueDate?.toISOString(),
    priority: row.priority,
    status: row.status,
    reminderEnabled: row.reminderEnabled ?? false,
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
  });

  const [withClient] = await attachClients([toTask(row)]);
  return withClient;
}

/** Quick opt-in/out toggle for the "sininho" reminder — reuses update() so
 * it rides the same outbox/sync path as every other field edit. */
async function setReminder(id: string, enabled: boolean): Promise<TaskWithClient> {
  return update(id, { reminderEnabled: enabled });
}

async function updateStatus(id: string, status: EntityStatus): Promise<TaskWithClient> {
  const existing = await db.tasks.get(id);
  if (!existing) throw new Error('Tarefa não encontrada localmente.');

  const now = new Date();
  const completedAt = status === 'completed' ? now : undefined;
  const row: LocalTask = { ...existing, status, updatedAt: now, completedAt };

  await db.tasks.put(row);
  await enqueueOutbox('task', id, 'status', {
    status,
    updatedAt: now.toISOString(),
    completedAt: completedAt?.toISOString(),
  });

  const [withClient] = await attachClients([toTask(row)]);
  return withClient;
}

/**
 * Drops completed tasks whose 24h stay has run out — from IndexedDB now and,
 * through the outbox, from the server on the next push. Called at the top of
 * every sync cycle, so it also runs offline: the local row goes immediately
 * and the delete rides out on reconnect.
 *
 * Returns how many rows it removed.
 */
async function purgeExpiredCompleted(): Promise<number> {
  const [completed, queued] = await Promise.all([
    db.tasks.where('status').equals('completed').toArray(),
    db.outbox.where('entity').equals('task').toArray(),
  ]);

  // A pull can hand a row back before its queued delete has made it to the
  // server; re-queueing the same delete every cycle would just grow the
  // outbox, so leave those to the entry that's already waiting.
  const awaitingDelete = new Set(
    queued.filter((entry) => entry.type === 'delete').map((entry) => entry.entityId)
  );
  const expired = completed.filter((row) => !awaitingDelete.has(row.id) && isExpiredCompletedTask(row));

  for (const row of expired) {
    await remove(row.id);
  }

  return expired.length;
}

async function remove(id: string): Promise<void> {
  await db.tasks.delete(id);
  const cancelled = await cancelPendingCreate('task', id);
  if (!cancelled) {
    await enqueueOutbox('task', id, 'delete');
  }
}

async function cascadeClientRemoval(clientId: string, action: 'unlink' | 'delete'): Promise<void> {
  const affected = await db.tasks.where('clientId').equals(clientId).toArray();

  for (const task of affected) {
    if (action === 'delete') {
      await remove(task.id);
    } else {
      await update(task.id, { clientId: undefined });
    }
  }
}

async function upsertFromServer(task: Task): Promise<void> {
  const existing = await db.tasks.get(task.id);
  if (existing && existing.updatedAt.toISOString() > task.updatedAt) return;
  await db.tasks.put(toLocalTask(task));
}

async function replaceLocal(task: Task): Promise<void> {
  await db.tasks.put(toLocalTask(task));
}

async function getAllLocalIds(): Promise<Set<string>> {
  const ids = await db.tasks.toCollection().primaryKeys();
  return new Set(ids);
}

async function removeLocalOnly(id: string): Promise<void> {
  await db.tasks.delete(id);
}

export const taskRepository = {
  list,
  get,
  create,
  update,
  updateStatus,
  setReminder,
  purgeExpiredCompleted,
  remove,
  cascadeClientRemoval,
  upsertFromServer,
  replaceLocal,
  getAllLocalIds,
  removeLocalOnly,
};
