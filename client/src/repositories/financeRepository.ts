import { db, LocalFinanceEntry } from '@/db/schema';
import { enqueueOutbox, cancelPendingCreate } from '@/db/outbox';
import { FinanceEntry, FinanceKind, PaymentMethod } from '@/types';
import { FinanceListParams, FinanceCreatePayload } from '@/services/financeService';
import { parseDateInput } from '@/utils/formatters';
import { goalRepository } from './goalRepository';

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
  paidInstallments?: number;
  cdiPercent?: number;
  boxId?: string;
}

/**
 * Mirrors the server's normalizeByKind: a receita must never keep a parcela
 * count, a despesa never a CDI rate. Applying it locally too means the row
 * the UI renders right after an edit already matches what the server will
 * store — no shape flip when the sync round-trip lands.
 *
 * For a despesa, `paidInstallments` is the source of truth and `paid` is
 * derived from it (all parcelas in). A row that only carries `paid` (older
 * data, or an edit that sent just the flag) maps to all-or-nothing.
 */
function normalizeByKind(row: LocalFinanceEntry): LocalFinanceEntry {
  if (row.kind === 'expense') {
    const count = row.paymentMethod === 'card' ? Math.max(1, Math.round(row.installments ?? 1)) : 1;
    const rawPaid = row.paidInstallments ?? (row.paid ? count : 0);
    const paidCount = Math.max(0, Math.min(count, Math.round(rawPaid)));
    const paid = paidCount >= count;
    return {
      ...row,
      cdiPercent: undefined,
      boxId: undefined,
      installments: count,
      paidInstallments: paidCount,
      paid,
      paidAt: paid ? (row.paidAt ?? new Date()) : undefined,
    };
  }
  return {
    ...row,
    paid: false,
    paidAt: undefined,
    paymentMethod: undefined,
    installments: undefined,
    paidInstallments: undefined,
    cdiPercent: row.kind === 'investment' ? row.cdiPercent : undefined,
    boxId: row.kind === 'investment' ? row.boxId : undefined,
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
    paidInstallments: row.paidInstallments,
    cdiPercent: row.cdiPercent,
    boxId: row.boxId ?? '',
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

  // Concluded clients count as receita, so they join the income ledger here —
  // one place, so the chart, the painel and the Receitas page can never disagree.
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
    throw new Error('Essa receita vem de um cliente concluído. Edite o cliente para alterá-la.');
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
    paidInstallments: input.paidInstallments,
    cdiPercent: input.cdiPercent,
    boxId: input.boxId || undefined,
    createdAt: now,
    updatedAt: now,
  });

  await db.finance.put(row);

  await enqueueOutbox('finance', row.id, 'create', {
    localId: row.id,
    createdAt: row.createdAt.toISOString(),
    ...toPayload(row),
  } satisfies FinanceCreatePayload);

  if (row.boxId) await goalRepository.syncCompletionForBox(row.boxId);
  return toEntry(row);
}

async function update(id: string, input: Partial<FinanceFormInput>): Promise<FinanceEntry> {
  assertStored(id);
  const existing = await db.finance.get(id);
  if (!existing) throw new Error('Registro não encontrado localmente.');

  const now = new Date();

  // A bare `paid` (the "já foi pago" toggle) means every parcela or none;
  // it must not be overruled by a stale count left on the row.
  const paidInstallments =
    input.paidInstallments !== undefined
      ? input.paidInstallments
      : input.paid !== undefined
        ? undefined
        : existing.paidInstallments;

  const row = normalizeByKind({
    ...existing,
    ...input,
    paidInstallments,
    date: input.date !== undefined ? (parseDateInput(input.date) ?? existing.date) : existing.date,
    category: 'category' in input ? input.category || undefined : existing.category,
    notes: 'notes' in input ? input.notes || undefined : existing.notes,
    clientId: 'clientId' in input ? input.clientId || undefined : existing.clientId,
    boxId: 'boxId' in input ? input.boxId || undefined : existing.boxId,
    // paidAt is only meaningful once everything is paid; normalizeByKind
    // clears it otherwise and stamps `now` when this edit is what settled it.
    paidAt: existing.paid ? existing.paidAt : undefined,
    updatedAt: now,
  });

  await db.finance.put(row);
  await enqueueOutbox('finance', id, 'update', toPayload(row));

  for (const boxId of new Set([existing.boxId, row.boxId])) {
    if (boxId) await goalRepository.syncCompletionForBox(boxId);
  }
  return toEntry(row);
}

/** The "já foi pago" toggle on a despesa — rides the same outbox path as any
 * other field edit, so there's no separate sync branch to keep in step. */
async function setPaid(id: string, paid: boolean): Promise<FinanceEntry> {
  return update(id, { paid });
}

/** Settles the next open parcela of a card despesa. Once the last one is in,
 * the despesa flips to paid on its own. */
async function payInstallment(id: string): Promise<FinanceEntry> {
  assertStored(id);
  const existing = await db.finance.get(id);
  if (!existing) throw new Error('Registro não encontrado localmente.');
  const current = normalizeByKind(existing);
  return update(id, { paidInstallments: (current.paidInstallments ?? 0) + 1 });
}

/** Reopens the most recently settled parcela — the undo for a mis-tap. */
async function undoInstallment(id: string): Promise<FinanceEntry> {
  assertStored(id);
  const existing = await db.finance.get(id);
  if (!existing) throw new Error('Registro não encontrado localmente.');
  const current = normalizeByKind(existing);
  return update(id, { paidInstallments: Math.max(0, (current.paidInstallments ?? 0) - 1) });
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
  payInstallment,
  undoInstallment,
  remove,
  upsertFromServer,
  replaceLocal,
  getAllLocalIds,
  removeLocalOnly,
};
