import { Request, Response } from 'express';
import { InvestmentBox } from '../models/InvestmentBox';
import { FinanceEntry } from '../models/FinanceEntry';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { createBoxSchema, updateBoxSchema } from '../validators/box.validators';

export const listBoxes = asyncHandler(async (req: Request, res: Response) => {
  const boxes = await InvestmentBox.find({ userId: req.userId }).sort({ createdAt: 1 }).lean();
  res.json({ boxes });
});

export const createBox = asyncHandler(async (req: Request, res: Response) => {
  const data = createBoxSchema.parse(req.body);

  // The outbox retries, so the same create can legitimately arrive twice.
  const existing = await InvestmentBox.findOne({ userId: req.userId, localId: data.localId }).lean();
  if (existing) {
    res.status(200).json({ box: existing });
    return;
  }

  const box = await InvestmentBox.create({ ...data, userId: req.userId });
  res.status(201).json({ box: box.toObject() });
});

export const updateBox = asyncHandler(async (req: Request, res: Response) => {
  const data = updateBoxSchema.parse(req.body);

  const box = await InvestmentBox.findOne({ localId: req.params.id, userId: req.userId });
  if (!box) throw ApiError.notFound('Cofrinho não encontrado.');

  // Last-write-wins on updatedAt, same as every other entity.
  if (data.updatedAt < box.updatedAt) {
    res.json({ box: box.toObject() });
    return;
  }

  Object.assign(box, data);
  await box.save();
  res.json({ box: box.toObject() });
});

export const deleteBox = asyncHandler(async (req: Request, res: Response) => {
  const box = await InvestmentBox.findOneAndDelete({ localId: req.params.id, userId: req.userId });
  if (!box) throw ApiError.notFound('Cofrinho não encontrado.');

  // The money stays: the investments just stop being grouped under a pot,
  // so the total invested (Home) is exactly what it was.
  await FinanceEntry.updateMany({ userId: req.userId, boxId: box.localId }, { $unset: { boxId: '' } });
  res.status(204).send();
});
