import { Schema, model, Document, Types } from 'mongoose';
import { PRIORITIES, STATUSES, Priority, EntityStatus } from '../types/enums';

export interface TaskDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Client-generated UUID. The stable, public identifier. */
  localId: string;
  title: string;
  description?: string;
  /** References Client.localId (a plain string, not a Mongoose ref) — a
   * client created offline only has a localId until it syncs, so the link
   * never needs translating to a server-assigned id. */
  clientId?: string;
  /** May carry a real time-of-day, not just a calendar date — local midnight
   * means "no time set" (see client's hasExplicitTime helper). */
  dueDate?: Date;
  priority: Priority;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  /** User opted in to a reminder notification 5h before dueDate. Only
   * meaningful when dueDate has an explicit time — actual scheduling
   * happens on-device (Capacitor local notifications / Web Notification
   * API), this just tracks the opt-in so it survives reinstalls/syncs. */
  reminderEnabled?: boolean;
}

const taskSchema = new Schema<TaskDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  localId: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  clientId: { type: String },
  dueDate: { type: Date },
  priority: { type: String, enum: PRIORITIES, required: true },
  status: { type: String, enum: STATUSES, required: true, default: 'pending' },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
  completedAt: { type: Date },
  reminderEnabled: { type: Boolean, default: false },
});

taskSchema.index({ userId: 1, localId: 1 }, { unique: true });
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, clientId: 1 });

export const Task = model<TaskDocument>('Task', taskSchema);
