import { db, LocalInvestmentBox } from '@/db/schema';
import { enqueueOutbox, cancelPendingCreate } from '@/db/outbox';
import { BoxColor, BoxSummary, FinanceEntry, InvestmentBox } from '@/types';
import { BoxCreatePayload } from '@/services/boxService';
import { financeRepository } from './financeRepository';
import { goalRepository } from './goalRepository';

function toBox(row: LocalInvestmentBox): InvestmentBox {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function toLocal(box: InvestmentBox): LocalInvestmentBox {
  return { ...box, createdAt: new Date(box.createdAt), updatedAt: new Date(box.updatedAt) };
}

export interface BoxFormInput {
  name: string;
  cdiPercent: number;
  color: BoxColor;
  notes?: string;
}

/** Folds a pot's entries into the numbers every view renders. */
export function summarizeBox(box: InvestmentBox, entries: FinanceEntry[]): BoxSummary {
  let deposited = 0;
  let withdrawn = 0;
  let last: string | undefined;
  for (const entry of entries) {
    if (entry.amount >= 0) deposited += entry.amount;
    else withdrawn += -entry.amount;
    if (!last || entry.date > last) last = entry.date;
  }
  return {
    box,
    balance: deposited - withdrawn,
    deposited,
    withdrawn,
    movements: entries.length,
    lastMovementAt: last,
  };
}

/** Every pot with its balance, oldest first (the order people created them). */
async function list(): Promise<BoxSummary[]> {
  const [rows, entries] = await Promise.all([
    db.investmentBoxes.toArray(),
    financeRepository.list({ kind: 'investment' }),
  ]);
  const byBox = new Map<string, FinanceEntry[]>();
  for (const entry of entries) {
    if (!entry.boxId) continue;
    const bucket = byBox.get(entry.boxId);
    if (bucket) bucket.push(entry);
    else byBox.set(entry.boxId, [entry]);
  }
  return rows
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((row) => {
      const box = toBox(row);
      return summarizeBox(box, byBox.get(box.id) ?? []);
    });
}

async function get(id: string): Promise<InvestmentBox | undefined> {
  const row = await db.investmentBoxes.get(id);
  return row ? toBox(row) : undefined;
}

function payload(row: LocalInvestmentBox) {
  return {
    name: row.name,
    cdiPercent: row.cdiPercent,
    color: row.color,
    // '' rather than undefined so a cleared note survives JSON.
    notes: row.notes ?? '',
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function create(input: BoxFormInput): Promise<InvestmentBox> {
  const now = new Date();
  const row: LocalInvestmentBox = {
    id: crypto.randomUUID(),
    name: input.name,
    cdiPercent: input.cdiPercent,
    color: input.color,
    notes: input.notes || undefined,
    createdAt: now,
    updatedAt: now,
  };
  await db.investmentBoxes.put(row);
  await enqueueOutbox('investmentBox', row.id, 'create', {
    localId: row.id,
    ...payload(row),
    createdAt: row.createdAt.toISOString(),
  } satisfies BoxCreatePayload);
  return toBox(row);
}

async function update(id: string, input: BoxFormInput): Promise<InvestmentBox> {
  const existing = await db.investmentBoxes.get(id);
  if (!existing) throw new Error('Cofrinho não encontrado localmente.');
  const row: LocalInvestmentBox = {
    ...existing,
    name: input.name,
    cdiPercent: input.cdiPercent,
    color: input.color,
    notes: input.notes || undefined,
    updatedAt: new Date(),
  };
  await db.investmentBoxes.put(row);
  await enqueueOutbox('investmentBox', id, 'update', payload(row));
  return toBox(row);
}

/**
 * Removes the pot but keeps the money: its entries become plain investments
 * (the server does the same), so the total invested doesn't move.
 */
async function remove(id: string): Promise<void> {
  await db.investmentBoxes.delete(id);
  const entries = await db.finance.where('boxId').equals(id).toArray();
  for (const entry of entries) {
    await db.finance.put({ ...entry, boxId: undefined });
  }
  // A goal that mirrored this pot goes back to its own deposits.
  for (const goal of await goalRepository.goalsLinkedTo(id)) {
    await goalRepository.setLinkedBox(goal.id, undefined);
  }
  const cancelled = await cancelPendingCreate('investmentBox', id);
  if (!cancelled) await enqueueOutbox('investmentBox', id, 'delete');
}

async function upsertFromServer(box: InvestmentBox): Promise<void> {
  const existing = await db.investmentBoxes.get(box.id);
  if (existing && existing.updatedAt.toISOString() > box.updatedAt) return;
  await db.investmentBoxes.put(toLocal(box));
}

async function replaceLocal(box: InvestmentBox): Promise<void> {
  await db.investmentBoxes.put(toLocal(box));
}

async function getAllLocalIds(): Promise<Set<string>> {
  return new Set(await db.investmentBoxes.toCollection().primaryKeys());
}

async function removeLocalOnly(id: string): Promise<void> {
  await db.investmentBoxes.delete(id);
}

export const boxRepository = {
  list,
  get,
  create,
  update,
  remove,
  upsertFromServer,
  replaceLocal,
  getAllLocalIds,
  removeLocalOnly,
};
