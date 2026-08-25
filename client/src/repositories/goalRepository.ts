import { db, LocalGoal, LocalGoalContribution } from '@/db/schema';
import { enqueueOutbox, cancelPendingCreate } from '@/db/outbox';
import { Goal, GoalContribution, GoalProgress } from '@/types';
import { GoalCreatePayload, GoalContributionCreatePayload } from '@/services/goalService';

function toGoal(row: LocalGoal): Goal {
  return {
    ...row,
    targetDate: row.targetDate.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toLocalGoal(goal: Goal): LocalGoal {
  return {
    ...goal,
    targetDate: new Date(goal.targetDate),
    completedAt: goal.completedAt ? new Date(goal.completedAt) : undefined,
    createdAt: new Date(goal.createdAt),
    updatedAt: new Date(goal.updatedAt),
  };
}

function toContribution(row: LocalGoalContribution): GoalContribution {
  return {
    ...row,
    date: row.date.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toLocalContribution(contribution: GoalContribution): LocalGoalContribution {
  return {
    ...contribution,
    date: new Date(contribution.date),
    createdAt: new Date(contribution.createdAt),
    updatedAt: new Date(contribution.updatedAt),
  };
}

export interface GoalFormInput {
  title: string;
  targetAmount: number;
  /** From an <input type="date">, or an ISO string. */
  targetDate: string;
  notes?: string;
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/** Folds a goal's deposits into the numbers every view renders. */
export function buildProgress(goal: Goal, contributions: GoalContribution[]): GoalProgress {
  const sorted = [...contributions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const saved = sorted.reduce((total, c) => total + c.amount, 0);
  const remaining = Math.max(0, goal.targetAmount - saved);
  const isComplete = saved >= goal.targetAmount;

  const targetDate = new Date(goal.targetDate);
  const monthsLeft = Math.max(0, monthsBetween(new Date(), targetDate));

  return {
    goal,
    contributions: sorted,
    saved,
    remaining,
    // Clamped: a goal that overshot still reads as full, not as 130%.
    percent: goal.targetAmount <= 0 ? 0 : Math.min(1, Math.max(0, saved / goal.targetAmount)),
    isComplete,
    isOverdue: !isComplete && targetDate.getTime() < Date.now(),
    monthsLeft,
    // Answers the question the prazo actually raises: "am I saving enough?"
    monthlyNeeded: isComplete ? 0 : monthsLeft <= 0 ? remaining : remaining / monthsLeft,
  };
}

/**
 * Metas and their deposits.
 *
 * Deposits are separate records rather than a running total, so two devices
 * adding money while offline both survive — see the GoalContribution doc.
 */
async function list(): Promise<GoalProgress[]> {
  const [goals, contributions] = await Promise.all([
    db.goals.toArray(),
    db.goalContributions.toArray(),
  ]);

  const byGoal = new Map<string, GoalContribution[]>();
  for (const row of contributions) {
    const contribution = toContribution(row);
    const bucket = byGoal.get(contribution.goalId);
    if (bucket) bucket.push(contribution);
    else byGoal.set(contribution.goalId, [contribution]);
  }

  const progress = goals.map((row) => {
    const goal = toGoal(row);
    return buildProgress(goal, byGoal.get(goal.id) ?? []);
  });

  // Open goals lead; among them, the soonest prazo first.
  return progress.sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
    return new Date(a.goal.targetDate).getTime() - new Date(b.goal.targetDate).getTime();
  });
}

async function get(id: string): Promise<GoalProgress | undefined> {
  const row = await db.goals.get(id);
  if (!row) return undefined;
  const contributions = await db.goalContributions.where('goalId').equals(id).toArray();
  return buildProgress(toGoal(row), contributions.map(toContribution));
}

function goalPayload(row: LocalGoal) {
  return {
    title: row.title,
    targetAmount: row.targetAmount,
    targetDate: row.targetDate.toISOString(),
    // '' rather than undefined so a cleared note survives JSON — an omitted
    // key reads on the server as "leave it as is".
    notes: row.notes ?? '',
    ...(row.completedAt ? { completedAt: row.completedAt.toISOString() } : {}),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function create(input: GoalFormInput): Promise<Goal> {
  const now = new Date();
  const row: LocalGoal = {
    id: crypto.randomUUID(),
    title: input.title,
    targetAmount: input.targetAmount,
    targetDate: new Date(input.targetDate),
    notes: input.notes || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await db.goals.put(row);
  await enqueueOutbox('goal', row.id, 'create', {
    localId: row.id,
    ...goalPayload(row),
    createdAt: row.createdAt.toISOString(),
  } satisfies GoalCreatePayload);

  return toGoal(row);
}

async function update(id: string, input: GoalFormInput): Promise<Goal> {
  const existing = await db.goals.get(id);
  if (!existing) throw new Error('Meta não encontrada localmente.');

  const row: LocalGoal = {
    ...existing,
    title: input.title,
    targetAmount: input.targetAmount,
    targetDate: new Date(input.targetDate),
    notes: input.notes || undefined,
    updatedAt: new Date(),
  };

  await db.goals.put(row);
  await enqueueOutbox('goal', id, 'update', goalPayload(row));
  return toGoal(row);
}

async function remove(id: string): Promise<void> {
  await db.goals.delete(id);

  // Drop the deposits locally too; the server cascades the same way, so the
  // pushed delete does not need to mention them.
  const contributions = await db.goalContributions.where('goalId').equals(id).toArray();
  for (const contribution of contributions) {
    await db.goalContributions.delete(contribution.id);
    await cancelPendingCreate('goalContribution', contribution.id);
  }

  const cancelled = await cancelPendingCreate('goal', id);
  if (!cancelled) {
    await enqueueOutbox('goal', id, 'delete');
  }
}

/** Adds money to a goal. Each call is a new record, never an increment. */
async function addContribution(
  goalId: string,
  amount: number,
  options: { date?: string; note?: string } = {}
): Promise<GoalContribution> {
  const now = new Date();
  const row: LocalGoalContribution = {
    id: crypto.randomUUID(),
    goalId,
    amount,
    date: options.date ? new Date(options.date) : now,
    note: options.note || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await db.goalContributions.put(row);
  await enqueueOutbox('goalContribution', row.id, 'create', {
    localId: row.id,
    goalId: row.goalId,
    amount: row.amount,
    date: row.date.toISOString(),
    note: row.note ?? '',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies GoalContributionCreatePayload);

  await syncCompletion(goalId);
  return toContribution(row);
}

async function removeContribution(id: string): Promise<void> {
  const existing = await db.goalContributions.get(id);

  await db.goalContributions.delete(id);
  const cancelled = await cancelPendingCreate('goalContribution', id);
  if (!cancelled) {
    await enqueueOutbox('goalContribution', id, 'delete');
  }

  if (existing) await syncCompletion(existing.goalId);
}

/**
 * Keeps `completedAt` in step with the deposits, so reaching the target marks
 * the goal done and pulling money back out reopens it.
 */
async function syncCompletion(goalId: string): Promise<void> {
  const progress = await get(goalId);
  if (!progress) return;

  const isMarked = Boolean(progress.goal.completedAt);
  if (progress.isComplete === isMarked) return;

  const existing = await db.goals.get(goalId);
  if (!existing) return;

  const now = new Date();
  const row: LocalGoal = {
    ...existing,
    completedAt: progress.isComplete ? now : undefined,
    updatedAt: now,
  };

  await db.goals.put(row);
  await enqueueOutbox('goal', goalId, 'update', goalPayload(row));
}

/* --- sync-engine hooks --- */

async function upsertGoalFromServer(goal: Goal): Promise<void> {
  const existing = await db.goals.get(goal.id);
  if (existing && existing.updatedAt.toISOString() > goal.updatedAt) return;
  await db.goals.put(toLocalGoal(goal));
}

async function upsertContributionFromServer(contribution: GoalContribution): Promise<void> {
  const existing = await db.goalContributions.get(contribution.id);
  if (existing && existing.updatedAt.toISOString() > contribution.updatedAt) return;
  await db.goalContributions.put(toLocalContribution(contribution));
}

async function replaceGoalLocal(goal: Goal): Promise<void> {
  await db.goals.put(toLocalGoal(goal));
}

async function replaceContributionLocal(contribution: GoalContribution): Promise<void> {
  await db.goalContributions.put(toLocalContribution(contribution));
}

async function getAllGoalIds(): Promise<Set<string>> {
  return new Set(await db.goals.toCollection().primaryKeys());
}

async function getAllContributionIds(): Promise<Set<string>> {
  return new Set(await db.goalContributions.toCollection().primaryKeys());
}

async function removeGoalLocalOnly(id: string): Promise<void> {
  await db.goals.delete(id);
}

async function removeContributionLocalOnly(id: string): Promise<void> {
  await db.goalContributions.delete(id);
}

export const goalRepository = {
  list,
  get,
  create,
  update,
  remove,
  addContribution,
  removeContribution,
  upsertGoalFromServer,
  upsertContributionFromServer,
  replaceGoalLocal,
  replaceContributionLocal,
  getAllGoalIds,
  getAllContributionIds,
  removeGoalLocalOnly,
  removeContributionLocalOnly,
};
