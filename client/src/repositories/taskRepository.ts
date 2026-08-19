import { db, LocalTask, LocalClient } from '@/db/schema';
import { enqueueOutbox, cancelPendingCreate } from '@/db/outbox';
import { Task, TaskWithClient, TaskClientRef, Priority, EntityStatus } from '@/types';
import { TaskListParams, TaskCreatePayload } from '@/services/taskService';
import { defaultTaskSort } from '@/utils/taskSort';

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
}

async function list(params: TaskListParams = {}): Promise<TaskWithClient[]> {
  let rows = await db.tasks.toArray();

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
  const row: LocalTask = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    clientId: input.clientId || undefined,
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    priority: input.priority,
    status: input.status ?? 'pending',
    createdAt: now,
    updatedAt: now,
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  await enqueueOutbox('task', row.id, 'create', payload);

  const [withClient] = await attachClients([toTask(row)]);
  return withClient;
}

async function update(id: string, input: Partial<TaskFormInput>): Promise<TaskWithClient> {
  const existing = await db.tasks.get(id);
  if (!existing) throw new Error('Tarefa não encontrada localmente.');

  const now = new Date();
  const row: LocalTask = {
    ...existing,
    ...input,
    dueDate: input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : undefined) : existing.dueDate,
    clientId: 'clientId' in input ? input.clientId || undefined : existing.clientId,
    updatedAt: now,
  };

  await db.tasks.put(row);
  await enqueueOutbox('task', id, 'update', {
    title: row.title,
    description: row.description,
    clientId: row.clientId ?? '',
    dueDate: row.dueDate?.toISOString(),
    priority: row.priority,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  });

  const [withClient] = await attachClients([toTask(row)]);
  return withClient;
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
  remove,
  cascadeClientRemoval,
  upsertFromServer,
  replaceLocal,
  getAllLocalIds,
  removeLocalOnly,
};
