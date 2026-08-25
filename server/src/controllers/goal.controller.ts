import { Request, Response } from 'express';
import { Goal, GoalContribution } from '../models/Goal';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import {
  createGoalSchema,
  updateGoalSchema,
  createGoalContributionSchema,
  updateGoalContributionSchema,
} from '../validators/goal.validators';

/**
 * Goals and their deposits come back together.
 *
 * Progress is meaningless without both, and the client needs to compute it on
 * every render — one round trip keeps them from ever arriving out of step.
 */
export const listGoals = asyncHandler(async (req: Request, res: Response) => {
  const [goals, contributions] = await Promise.all([
    Goal.find({ userId: req.userId }).sort({ targetDate: 1 }).lean(),
    GoalContribution.find({ userId: req.userId }).sort({ date: -1 }).lean(),
  ]);

  res.json({ goals, contributions });
});

export const createGoal = asyncHandler(async (req: Request, res: Response) => {
  const data = createGoalSchema.parse(req.body);

  // The outbox retries, so the same create can legitimately arrive twice.
  const existing = await Goal.findOne({ userId: req.userId, localId: data.localId }).lean();
  if (existing) {
    res.status(200).json({ goal: existing });
    return;
  }

  const goal = await Goal.create({ ...data, userId: req.userId });
  res.status(201).json({ goal: goal.toObject() });
});

export const updateGoal = asyncHandler(async (req: Request, res: Response) => {
  const data = updateGoalSchema.parse(req.body);

  const goal = await Goal.findOne({ localId: req.params.id, userId: req.userId });
  if (!goal) throw ApiError.notFound('Meta não encontrada.');

  // Last-write-wins on updatedAt, same as every other entity: a stale push
  // from a device that was offline must not clobber a newer edit.
  if (data.updatedAt < goal.updatedAt) {
    res.json({ goal: goal.toObject() });
    return;
  }

  Object.assign(goal, data);
  await goal.save();
  res.json({ goal: goal.toObject() });
});

export const deleteGoal = asyncHandler(async (req: Request, res: Response) => {
  const goal = await Goal.findOneAndDelete({ localId: req.params.id, userId: req.userId });
  if (!goal) throw ApiError.notFound('Meta não encontrada.');

  // A deposit without its goal is unreachable, so the cascade happens here
  // rather than leaving orphans for the next sync to puzzle over.
  await GoalContribution.deleteMany({ userId: req.userId, goalId: goal.localId });
  res.status(204).send();
});

export const createGoalContribution = asyncHandler(async (req: Request, res: Response) => {
  const data = createGoalContributionSchema.parse(req.body);

  const existing = await GoalContribution.findOne({
    userId: req.userId,
    localId: data.localId,
  }).lean();
  if (existing) {
    res.status(200).json({ contribution: existing });
    return;
  }

  const goal = await Goal.findOne({ userId: req.userId, localId: data.goalId }).lean();
  if (!goal) throw ApiError.notFound('Meta não encontrada.');

  const contribution = await GoalContribution.create({ ...data, userId: req.userId });
  res.status(201).json({ contribution: contribution.toObject() });
});

export const updateGoalContribution = asyncHandler(async (req: Request, res: Response) => {
  const data = updateGoalContributionSchema.parse(req.body);

  const contribution = await GoalContribution.findOne({
    localId: req.params.id,
    userId: req.userId,
  });
  if (!contribution) throw ApiError.notFound('Depósito não encontrado.');

  if (data.updatedAt < contribution.updatedAt) {
    res.json({ contribution: contribution.toObject() });
    return;
  }

  Object.assign(contribution, data);
  await contribution.save();
  res.json({ contribution: contribution.toObject() });
});

export const deleteGoalContribution = asyncHandler(async (req: Request, res: Response) => {
  const contribution = await GoalContribution.findOneAndDelete({
    localId: req.params.id,
    userId: req.userId,
  });
  if (!contribution) throw ApiError.notFound('Depósito não encontrado.');
  res.status(204).send();
});
