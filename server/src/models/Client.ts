import { Schema, model, Document, Types } from 'mongoose';
import { PRIORITIES, STATUSES, Priority, EntityStatus } from '../types/enums';

export interface ClientDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  phone: string;
  service: string;
  price: number;
  avatarUrl?: string;
  initials: string;
  priority: Priority;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<ClientDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    service: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    avatarUrl: { type: String },
    initials: { type: String, required: true },
    priority: { type: String, enum: PRIORITIES, required: true },
    status: { type: String, enum: STATUSES, required: true, default: 'pending' },
  },
  { timestamps: true }
);

clientSchema.index({ userId: 1, status: 1 });
clientSchema.index({ userId: 1, priority: 1 });
clientSchema.index({ userId: 1, name: 1 });

export const Client = model<ClientDocument>('Client', clientSchema);
