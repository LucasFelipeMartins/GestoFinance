import { Schema, model, Document, Types } from 'mongoose';
import { PRIORITIES, STATUSES, Priority, EntityStatus } from '../types/enums';

export interface TaskDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description?: string;
  clientId?: Types.ObjectId;
  dueDate?: Date;
  priority: Priority;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const taskSchema = new Schema<TaskDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    dueDate: { type: Date },
    priority: { type: String, enum: PRIORITIES, required: true },
    status: { type: String, enum: STATUSES, required: true, default: 'pending' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, clientId: 1 });

export const Task = model<TaskDocument>('Task', taskSchema);
