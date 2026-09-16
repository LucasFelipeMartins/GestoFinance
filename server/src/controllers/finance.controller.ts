import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { FinanceEntry, FinanceEntryDocument } from '../models/FinanceEntry';
import { FinanceKind, PaymentMethod } from '../types/enums';
import { asyncHandler } from '../utils/asyncHandler';
import { searchRegex } from '../utils/search';
import { ApiError } from '../utils/ApiError';
import {
  createFinanceSchema,
  updateFinanceSchema,
  financeQuerySchema,
} from '../validators/finance.validators';

/** Fields only some kinds carry. Rather than trust the client to blank the
 * irrelevant ones, derive them from `kind` here — an entry edited from
 * "despesa" to "receita" can then never keep a stray parcela count. */
interface NormalizableEntry {
  kind: FinanceKind;
  paid?: boolean;
  paidAt?: Date;
  paymentMethod?: PaymentMethod;
  installments?: number;
  paidInstallments?: number;
  cdiPercent?: number;
  clientId?: string;
  [key: string]: unknown;
}

function normalizeByKind(entry: NormalizableEntry): NormalizableEntry {
  if (entry.clientId === '') entry.clientId = undefined;

  if (entry.kind === 'expense') {
    entry.cdiPercent = undefined;
    // Parcelas only mean something on a card; a pix always lands in one go.
    const count = entry.paymentMethod === 'card' ? Math.max(1, Math.round(entry.installments ?? 1)) : 1;
    entry.installments = count;

    // `paid` and `paidInstallments` describe the same fact from two angles,
    // so keep them in step: the count is the source of truth when present,
    // and a bare `paid` flag (older clients, the native app) maps to
    // all-or-nothing.
    const paidCount = Math.max(
      0,
      Math.min(count, Math.round(entry.paidInstallments ?? (entry.paid ? count : 0)))
    );
    entry.paidInstallments = paidCount;
    entry.paid = paidCount >= count;
    if (!entry.paid) entry.paidAt = undefined;
    else entry.paidAt = entry.paidAt ?? new Date();
    return entry;
  }

  // Receitas and investimentos have no payment/parcela concept at all.
  entry.paid = false;
  entry.paidAt = undefined;
  entry.paymentMethod = undefined;
  entry.installments = undefined;
  entry.paidInstallments = undefined;
  if (entry.kind === 'income') entry.cdiPercent = undefined;
  return entry;
}

export const listFinanceEntries = asyncHandler(async (req: Request, res: Response) => {
  const query = financeQuerySchema.parse(req.query);

  const filter: FilterQuery<FinanceEntryDocument> = { userId: req.userId };
  if (query.kind) filter.kind = query.kind;
  if (query.paid !== undefined) filter.paid = query.paid;
  if (query.clientId) filter.clientId = query.clientId;
  if (query.search) {
    const regex = searchRegex(query.search);
    filter.$or = [{ description: regex }, { category: regex }, { notes: regex }];
  }

  const sortField = query.sort ?? 'date';
  const order = query.order === 'asc' ? 1 : -1;
  const entries = await FinanceEntry.find(filter)
    .sort({ [sortField]: order })
    .lean();

  res.json({ entries });
});

export const getFinanceEntry = asyncHandler(async (req: Request, res: Response) => {
  const entry = await FinanceEntry.findOne({ localId: req.params.id, userId: req.userId }).lean();
  if (!entry) throw ApiError.notFound('Lançamento não encontrado.');
  res.json({ entry });
});

export const createFinanceEntry = asyncHandler(async (req: Request, res: Response) => {
  const data = createFinanceSchema.parse(req.body);

  // The outbox retries, so the same create can legitimately arrive twice —
  // return the stored entry instead of creating a duplicate.
  const existing = await FinanceEntry.findOne({ userId: req.userId, localId: data.localId }).lean();
  if (existing) {
    res.status(200).json({ entry: existing });
    return;
  }

  const entry = await FinanceEntry.create({
    ...normalizeByKind({ ...data }),
    userId: req.userId,
  });

  res.status(201).json({ entry: entry.toObject() });
});

export const updateFinanceEntry = asyncHandler(async (req: Request, res: Response) => {
  const data = updateFinanceSchema.parse(req.body);

  const entry = await FinanceEntry.findOne({ localId: req.params.id, userId: req.userId });
  if (!entry) throw ApiError.notFound('Lançamento não encontrado.');

  // Last-write-wins on updatedAt, same as clients/tasks: a stale push from a
  // device that was offline must not clobber a newer edit.
  if (data.updatedAt < entry.updatedAt) {
    res.json({ entry: entry.toObject() });
    return;
  }

  // Fold the stored values in before normalising. Without this a partial
  // update that omits `paid` would read as "not paid" and normalizeByKind
  // would clear paidAt on an already-settled despesa.
  //
  // A `paid` flag sent without a parcela count (the "já foi pago" toggle
  // from a client that doesn't track parcelas) means all-or-nothing, so it
  // must override the stored count rather than be overridden by it.
  const paidInstallments =
    data.paidInstallments !== undefined
      ? data.paidInstallments
      : data.paid !== undefined
        ? undefined
        : entry.paidInstallments;

  Object.assign(
    entry,
    normalizeByKind({
      ...data,
      kind: data.kind ?? entry.kind,
      paid: data.paid ?? entry.paid,
      paidAt: data.paidAt ?? entry.paidAt,
      paymentMethod: data.paymentMethod ?? entry.paymentMethod,
      installments: data.installments ?? entry.installments,
      paidInstallments,
    })
  );

  await entry.save();
  res.json({ entry: entry.toObject() });
});

export const deleteFinanceEntry = asyncHandler(async (req: Request, res: Response) => {
  const entry = await FinanceEntry.findOneAndDelete({ localId: req.params.id, userId: req.userId });
  if (!entry) throw ApiError.notFound('Lançamento não encontrado.');
  res.status(204).send();
});
