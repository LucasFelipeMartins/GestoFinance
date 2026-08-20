import { db, LocalClient } from '@/db/schema';
import { enqueueOutbox, cancelPendingCreate } from '@/db/outbox';
import { Client, Priority, EntityStatus } from '@/types';
import { ClientListParams, ClientCreatePayload } from '@/services/clientService';
import { getInitials, parseDateInput } from '@/utils/formatters';
import { taskRepository } from './taskRepository';

function toClient(row: LocalClient): Client {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deliveryDate: row.deliveryDate?.toISOString(),
    completedAt: row.completedAt?.toISOString(),
  };
}

function toLocalClient(client: Client): LocalClient {
  return {
    ...client,
    createdAt: new Date(client.createdAt),
    updatedAt: new Date(client.updatedAt),
    deliveryDate: client.deliveryDate ? new Date(client.deliveryDate) : undefined,
    completedAt: client.completedAt ? new Date(client.completedAt) : undefined,
  };
}

export interface ClientFormInput {
  name: string;
  phone: string;
  service: string;
  price: number;
  priority: Priority;
  status?: EntityStatus;
  avatarUrl?: string;
  /** From an <input type="date">: "YYYY-MM-DD", or '' to clear it. */
  deliveryDate?: string;
}

async function list(params: ClientListParams = {}): Promise<Client[]> {
  let rows = await db.clients.toArray();

  if (params.status) rows = rows.filter((r) => r.status === params.status);
  if (params.priority) rows = rows.filter((r) => r.priority === params.priority);
  if (params.search) {
    const term = params.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.phone.toLowerCase().includes(term) ||
        r.service.toLowerCase().includes(term)
    );
  }

  const sortField = params.sort ?? 'createdAt';
  const order = params.order === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    const av = a[sortField as keyof LocalClient];
    const bv = b[sortField as keyof LocalClient];
    if (av === bv) return 0;
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    return av > bv ? order : -order;
  });

  return rows.map(toClient);
}

async function get(id: string): Promise<Client | undefined> {
  const row = await db.clients.get(id);
  return row ? toClient(row) : undefined;
}

async function create(input: ClientFormInput): Promise<Client> {
  const now = new Date();
  const row: LocalClient = {
    id: crypto.randomUUID(),
    name: input.name,
    phone: input.phone,
    service: input.service,
    price: input.price,
    priority: input.priority,
    status: input.status ?? 'pending',
    avatarUrl: input.avatarUrl,
    initials: getInitials(input.name),
    deliveryDate: parseDateInput(input.deliveryDate ?? ''),
    createdAt: now,
    updatedAt: now,
  };

  await db.clients.put(row);

  const payload: ClientCreatePayload = {
    localId: row.id,
    name: row.name,
    phone: row.phone,
    service: row.service,
    price: row.price,
    priority: row.priority,
    status: row.status,
    avatarUrl: row.avatarUrl,
    deliveryDate: row.deliveryDate?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  await enqueueOutbox('client', row.id, 'create', payload);

  return toClient(row);
}

async function update(id: string, input: Partial<ClientFormInput>): Promise<Client> {
  const existing = await db.clients.get(id);
  if (!existing) throw new Error('Cliente não encontrado localmente.');

  const now = new Date();
  const row: LocalClient = {
    ...existing,
    ...input,
    initials: input.name ? getInitials(input.name) : existing.initials,
    deliveryDate:
      input.deliveryDate === undefined ? existing.deliveryDate : parseDateInput(input.deliveryDate),
    updatedAt: now,
  };

  await db.clients.put(row);
  await enqueueOutbox('client', id, 'update', {
    name: row.name,
    phone: row.phone,
    service: row.service,
    price: row.price,
    priority: row.priority,
    status: row.status,
    avatarUrl: row.avatarUrl,
    // '' rather than undefined so a cleared date survives JSON and the
    // server can tell 'clear it' from 'field not included'.
    deliveryDate: row.deliveryDate?.toISOString() ?? '',
    updatedAt: row.updatedAt.toISOString(),
  });

  return toClient(row);
}

async function updateStatus(id: string, status: EntityStatus): Promise<Client> {
  const existing = await db.clients.get(id);
  if (!existing) throw new Error('Cliente não encontrado localmente.');

  const now = new Date();
  const completedAt = status === 'completed' ? now : undefined;
  const row: LocalClient = { ...existing, status, updatedAt: now, completedAt };
  await db.clients.put(row);
  await enqueueOutbox('client', id, 'status', {
    status,
    updatedAt: now.toISOString(),
    completedAt: completedAt?.toISOString(),
  });

  return toClient(row);
}

async function remove(id: string, tasksAction: 'unlink' | 'delete' = 'unlink'): Promise<void> {
  await db.clients.delete(id);
  await taskRepository.cascadeClientRemoval(id, tasksAction);

  const cancelled = await cancelPendingCreate('client', id);
  if (!cancelled) {
    await enqueueOutbox('client', id, 'delete', { tasksAction });
  }
}

/** Used by the sync engine to merge server state into the local DB. */
async function upsertFromServer(client: Client): Promise<void> {
  const existing = await db.clients.get(client.id);
  if (existing && existing.updatedAt.toISOString() > client.updatedAt) {
    // Local version is newer (edited offline since the last pull) — keep it,
    // the outbox will push it and reconcile on the next round trip.
    return;
  }
  await db.clients.put(toLocalClient(client));
}

async function replaceLocal(client: Client): Promise<void> {
  await db.clients.put(toLocalClient(client));
}

async function getAllLocalIds(): Promise<Set<string>> {
  const ids = await db.clients.toCollection().primaryKeys();
  return new Set(ids);
}

async function removeLocalOnly(id: string): Promise<void> {
  await db.clients.delete(id);
}

export const clientRepository = {
  list,
  get,
  create,
  update,
  updateStatus,
  remove,
  upsertFromServer,
  replaceLocal,
  getAllLocalIds,
  removeLocalOnly,
};
