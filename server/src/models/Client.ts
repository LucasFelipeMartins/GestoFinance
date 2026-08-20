import { Schema, model, Document, Types } from 'mongoose';
import { PRIORITIES, STATUSES, Priority, EntityStatus } from '../types/enums';

export interface ClientDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Client-generated UUID. The stable, public identifier — exists from the
   * moment of (possibly offline) creation and never changes, unlike _id. */
  localId: string;
  name: string;
  phone: string;
  service: string;
  price: number;
  avatarUrl?: string;
  initials: string;
  priority: Priority;
  status: EntityStatus;
  /** Optional agreed delivery date for the client's project. */
  deliveryDate?: Date;
  /** Set when status becomes 'completed' — drives the Home 24h auto-hide. */
  completedAt?: Date;
  /** Client-authoritative (not auto-stamped): needed so last-write-wins sync
   * can compare timestamps set on the device, not on arrival at the server. */
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<ClientDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  localId: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  service: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  avatarUrl: { type: String },
  initials: { type: String, required: true },
  priority: { type: String, enum: PRIORITIES, required: true },
  status: { type: String, enum: STATUSES, required: true, default: 'pending' },
  deliveryDate: { type: Date },
  completedAt: { type: Date },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
});

clientSchema.index({ userId: 1, localId: 1 }, { unique: true });
clientSchema.index({ userId: 1, status: 1 });
clientSchema.index({ userId: 1, priority: 1 });
clientSchema.index({ userId: 1, name: 1 });
clientSchema.index({ userId: 1, deliveryDate: 1 });

export const Client = model<ClientDocument>('Client', clientSchema);
