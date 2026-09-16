import { Schema, model, Document, Types } from 'mongoose';

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  /**
   * When the address was confirmed by code. Only accounts created after
   * e-mail confirmation became mandatory carry it — older accounts have no
   * value here and are treated exactly as before (login never checks it).
   */
  emailVerifiedAt?: Date;
  /** End of the free trial. Set at sign-up; older accounts get one on their
   * first request after billing went live (see ensureTrial). */
  trialEndsAt?: Date;
  /** Access is paid up to this instant. Each approved payment pushes it
   * forward by one period, starting from whichever is later: now, the
   * previous paidUntil or the trial end — nobody loses days by paying early. */
  paidUntil?: Date;
  lastPaymentAt?: Date;
  /** Mercado Pago preapproval id when the person pays by card: the
   * subscription that renews itself every period until cancelled. */
  subscriptionId?: string;
  /** pending | authorized | paused | cancelled (Mercado Pago's own states). */
  subscriptionStatus?: string;
  subscriptionCancelledAt?: Date;
  /** Baked into every JWT; bumping it signs the person out everywhere
   * (password reset/change). */
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String },
    emailVerifiedAt: { type: Date },
    trialEndsAt: { type: Date },
    paidUntil: { type: Date },
    lastPaymentAt: { type: Date },
    subscriptionId: { type: String, index: true },
    subscriptionStatus: { type: String },
    subscriptionCancelledAt: { type: Date },
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = model<UserDocument>('User', userSchema);
