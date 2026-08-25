import { Schema, model, Document, Types } from 'mongoose';

export interface GoalDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Client-generated UUID. The stable, public identifier. */
  localId: string;
  /** What the user is saving for: "Viajar", "Notebook novo". */
  title: string;
  /** How much they want to have put aside by targetDate. */
  targetAmount: number;
  /**
   * When they want to get there.
   *
   * Stored as a real date rather than the "5 meses" the form asks for: a
   * stored duration would silently mean something different tomorrow, while
   * a date keeps meaning the same day forever.
   */
  targetDate: Date;
  notes?: string;
  /** Set when the goal is reached, so it can be celebrated once and then
   * stop competing for attention on Home. */
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<GoalDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  localId: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  targetAmount: { type: Number, required: true, min: 0 },
  targetDate: { type: Date, required: true },
  notes: { type: String, trim: true },
  completedAt: { type: Date },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
});

goalSchema.index({ userId: 1, localId: 1 }, { unique: true });
goalSchema.index({ userId: 1, targetDate: 1 });

export const Goal = model<GoalDocument>('Goal', goalSchema);

export interface GoalContributionDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  localId: string;
  /** References Goal.localId (a plain string, same convention as Task). */
  goalId: string;
  amount: number;
  date: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One deposit toward a goal.
 *
 * Deliberately its own record rather than a running total on the Goal: two
 * devices each adding a deposit while offline both survive, because each is
 * an independent create. A single `savedAmount` field would resolve
 * last-write-wins and quietly drop one of them.
 */
const goalContributionSchema = new Schema<GoalContributionDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  localId: { type: String, required: true },
  goalId: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  note: { type: String, trim: true },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
});

goalContributionSchema.index({ userId: 1, localId: 1 }, { unique: true });
goalContributionSchema.index({ userId: 1, goalId: 1 });

export const GoalContribution = model<GoalContributionDocument>(
  'GoalContribution',
  goalContributionSchema
);
