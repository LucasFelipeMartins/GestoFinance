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
  },
  { timestamps: true }
);

export const User = model<UserDocument>('User', userSchema);
