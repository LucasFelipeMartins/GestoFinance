import { db, LocalFinanceEntry } from '@/db/schema';
import { enqueueOutbox, cancelPendingCreate } from '@/db/outbox';
import { FinanceEntry, FinanceKind, PaymentMethod } from '@/types';
import { FinanceListParams, FinanceCreatePayload } from '@/services/financeService';
import { parseDateInput } from '@/utils/formatters';

function toEntry(row: LocalFinanceEntry): FinanceEntry {
  return {
    ...row,
    date: row.date.toISOString(),
    paidAt: row.paidAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toLocalEntry(entry: FinanceEntry): LocalFinanceEntry {
  return {
    ...entry,
    date: new Date(entry.date),
    paidAt: entry.paidAt ? new Date(entry.paidAt) : undefined,
    createdAt: new Date(entry.createdAt),
    updatedAt: new Date(entry.updatedAt),
  };
}

export interface FinanceFormInput {
  kind: FinanceKind;
  description: string;
  amount: number;
  /** From an <input type="date">: "YYYY-MM-DD". */
  date: string;
  category?: string;
  notes?: string;
  clientId?: string;
  paid?: boolean;
  paymentMethod?: PaymentMethod;
  installments?: number;
  cdiPercent?: number;
}

/**
 * Mirrors the server's normalizeByKind: a receita must never keep a parcela
 * count, a despesa never a CDI rate. Applying it locally too means the row
 * the UI renders right after an edit already matches what the server will
 * store — no shape flip when the sync round-trip lands.
 */
function normalizeByKind(row: LocalFinanceEntry): LocalFinanceEntry {
  if (row.kind === 'expense') {
    return {
      ...row,
      cdiPercent: undefined,
      installments: row.paymentMethod === 'card' ? Math.max(1, row.installments ?? 1) : 1,
      paidAt: row.paid ? (row.paidAt ?? new Date()) : undefined,
    };
  }
  return {
    ...row,
    paid: false,
    paidAt: undefined,
    paymentMethod: undefined,
    installments: undefined,
    cdiPercent: row.kind === 'investment' ? row.cdiPercent : undefined,
  };
}

function toPayload(row: LocalFinanceEntry): Omit<FinanceCreatePayload, 'localId' | 'createdAt'> {
  return {
    kind: row.kind,
    description: row.description,
    amount: row.amount,
    date: row.date.toISOString(),
    // '' rather than undefined for every clearable field: JSON.stringify drops
    // undefined keys, so sending undefined reads on the server as "field not
    // included" and the old value survives — the cleared text would come back
    // on the next sync. (Same reasoning as Client.deliveryDate.)
    category: row.category ?? '',
    notes: row.notes ?? '',
    clientId: row.clientId ?? '',
    paid: row.paid,
    paidAt: row.paidAt?.toISOString(),
    paymentMethod: row.paymentMethod,
    installments: row.installments,
    cdiPercent: row.cdiPercent,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Namespaced so a derived id can never collide with a real (UUID) one. */
const CLIENT_INCOME_PREFIX = 'client:';

export function isDerivedEntry(entry: FinanceEntry): boolean {
  return entry.source === 'client';
}

/**
 * The receita a concluded client produces.
 *
 * Derived on every read rather than written into the finance table when the
 * client is completed. That means: no duplicate row if the outbox retries a
 * status push, no orphan if the client is later deleted, no stale amount if
 * its price is edited, and reopening a client simply makes its receita go
 * away again. The cost is that these rows are read-only here — the client
 * itself is where they are edited.
 */
async function deriveClientIncome(): Promise<FinanceEntry[]> {
  const clients = await db.clients.where('status').equals('completed').toArray();

  return clients
    .filter((client) => client.price > 0)
    .map((client) => {
      // Clients completed before completedAt existed fall back to updatedAt,
      // which is when the status change landed.
      const receivedAt = client.completedAt ?? client.updatedAt;
      return {
        id: `${CLIENT_INCOME_PREFIX}${client.id}`,
        kind: 'income' as const,
        description: client.name,
        amount: client.price,
        date: receivedAt.toISOString(),
        category: client.service,
        clientId: client.id,
        source: 'client' as const,
        paid: false,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
      };
    });
}

async function list(params: FinanceListParams = {}): Promise<FinanceEntry[]> {
  const rows = params.kind
    ? await db.finance.where('kind').equals(params.kind).toArray()
    : await db.finance.toArray();

  let entries = rows.map(toEntry);

  // Concluded clients count as lucro, so they join the income ledger here —
  // one place, so the chart, the painel and the Lucros page can never disagree.
  if (!params.kind || params.kind === 'income') {
    entries = entries.concat(await deriveClientIncome());
  }

  if (params.paid !== undefined) entries = entries.filter((e) => Boolean(e.paid) === params.paid);
  if (params.clientId) entries = entries.filter((e) => e.clientId === params.clientId);
  if (params.search) {
    const term = params.search.trim().toLowerCase();
    entries = entries.filter(
      (e) =>
        e.description.toLowerCase().includes(term) ||
        (e.category ?? '').toLowerCase().includes(term) ||
        (e.notes ?? '').toLowerCase().includes(term)
    );
  }

  const sortField = params.sort ?? 'date';
  const order = params.order === 'asc' ? 1 : -1;
  entries.sort((a, b) => {
    const av = a[sortField as keyof FinanceEntry];
    const bv = b[sortField as keyof FinanceEntry];
    if (av === bv) return 0;
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    return av > bv ? order : -order;
  });

  return entries;
}

async function get(id: string): Promise<FinanceEntry | undefined> {
  if (id.startsWith(CLIENT_INCOME_PREFIX)) {
    const derived = await deriveClientIncome();
    return derived.find((entry) => entry.id === id);
  }
  const row = await db.finance.get(id);
  return row ? toEntry(row) : undefined;
}

/** Derived rows have no stored counterpart, so nothing here can edit them. */
function assertStored(id: string): void {
  if (id.startsWith(CLIENT_INCOME_PREFIX)) {
    throw new Error('Esse lucro vem de um cliente concluído. Edite o cliente para alterá-lo.');
  }
}

async function create(input: FinanceFormInput): Promise<FinanceEntry> {
  const now = new Date();
  const row = normalizeByKind({
    id: crypto.randomUUID(),
    kind: input.kind,
    description: input.description,
    amount: input.amount,
    date: parseDateInput(input.date) ?? now,
    category: input.category || undefined,
    notes: input.notes || undefined,
    clientId: input.clientId || undefined,
    paid: input.paid ?? false,
    paymentMethod: input.paymentMethod,
    installments: input.installments,
    cdiPercent: input.cdiPercent,
    createdAt: now,
    updatedAt: now,
  });

  await db.finance.put(row);

  await enqueueOutbox('finance', row.id, 'create', {
    localId: row.id,
    createdAt: row.createdAt.toISOString(),
    ...toPayload(row),
  } satisfies FinanceCreatePayload);

  return toEntry(row);
}

async function update(id: string, input: Partial<FinanceFormInput>): Promise<FinanceEntry> {
  assertStored(id);
  const existing = await db.finance.get(id);
  if (!existing) throw new Error('Lançamento não encontrado localmente.');

  const now = new Date();
  const row = normalizeByKind({
    ...existing,
    ...input,
    date: input.date !== undefined ? (parseDateInput(input.date) ?? existing.date) : existing.date,
    category: 'category' in input ? input.category || undefined : existing.category,
    notes: 'notes' in input ? input.notes || undefined : existing.notes,
    clientId: 'clientId' in input ? input.clientId || undefined : existing.clientId,
    // A fresh paidAt only when this edit is what flipped it to paid.
    paidAt: input.paid && !existing.paid ? now : existing.paidAt,
    updatedAt: now,
  });

  await db.finance.put(row);
  await enqueueOutbox('finance', id, 'update', toPayload(row));

  return toEntry(row);
}

/** The "já foi pago" toggle on a despesa — rides the same outbox path as any
 * other field edit, so there's no separate sync branch to keep in step. */
async function setPaid(id: string, paid: boolean): Promise<FinanceEntry> {
  return update(id, { paid });
}

async function remove(id: string): Promise<void> {
  assertStored(id);
  await db.finance.delete(id);
  const cancelled = await cancelPendingCreate('finance', id);
  if (!cancelled) {
    await enqueueOutbox('finance', id, 'delete');
  }
}

async function upsertFromServer(entry: FinanceEntry): Promise<void> {
  const existing = await db.finance.get(entry.id);
  if (existing && existing.updatedAt.toISOString() > entry.updatedAt) {
    // Local version is newer (edited offline since the last pull) — keep it,
    // the outbox will push it and reconcile on the next round trip.
    return;
  }
  await db.finance.put(toLocalEntry(entry));
}

async function replaceLocal(entry: FinanceEntry): Promise<void> {
  await db.finance.put(toLocalEntry(entry));
}

async function getAllLocalIds(): Promise<Set<string>> {
  const ids = await db.finance.toCollection().primaryKeys();
  return new Set(ids);
}

async function removeLocalOnly(id: string): Promise<void> {
  await db.finance.delete(id);
}

export const financeRepository = {
  list,
  deriveClientIncome,
  get,
  create,
  update,
  setPaid,
  remove,
  upsertFromServer,
  replaceLocal,
  getAllLocalIds,
  removeLocalOnly,
};
