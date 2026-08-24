import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { FinanceEntry, FinanceEntryDocument } from '../models/FinanceEntry';
import { FinanceKind, PaymentMethod } from '../types/enums';
import { asyncHandler } from '../utils/asyncHandler';
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
  cdiPercent?: number;
  clientId?: string;
  [key: string]: unknown;
}

function normalizeByKind(entry: NormalizableEntry): NormalizableEntry {
  if (entry.clientId === '') entry.clientId = undefined;

  if (entry.kind === 'expense') {
    entry.cdiPercent = undefined;
    // Parcelas only mean something on a card; a pix always lands in one go.
    if (entry.paymentMethod !== 'card') entry.installments = 1;
    if (!entry.paid) entry.paidAt = undefined;
    return entry;
  }

  // Receitas and investimentos have no payment/parcela concept at all.
  entry.paid = false;
  entry.paidAt = undefined;
  entry.paymentMethod = undefined;
  entry.installments = undefined;
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
    const regex = new RegExp(query.search.trim(), 'i');
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
  Object.assign(
    entry,
    normalizeByKind({
      ...data,
      kind: data.kind ?? entry.kind,
      paid: data.paid ?? entry.paid,
      paidAt: data.paidAt ?? entry.paidAt,
      paymentMethod: data.paymentMethod ?? entry.paymentMethod,
      installments: data.installments ?? entry.installments,
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
