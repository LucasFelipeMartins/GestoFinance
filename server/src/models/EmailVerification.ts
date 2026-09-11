import { Schema, model, Document, Types } from 'mongoose';

/** What a code/token was issued for. Each purpose keeps at most one live
 * record per e-mail — asking again replaces the previous one. */
export const VERIFICATION_PURPOSES = ['register', 'reset'] as const;
export type VerificationPurpose = (typeof VERIFICATION_PURPOSES)[number];

/**
 * A pending e-mail challenge: the 6-digit code sent before an account is
 * created, or the one-time link sent to reset a password.
 *
 * Only a hash of the secret is stored, so a database leak alone never lets
 * anyone finish a registration or reset a password. Rows expire on their own
 * through the TTL index on `expiresAt`.
 */
export interface EmailVerificationDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  purpose: VerificationPurpose;
  tokenHash: string;
  expiresAt: Date;
  /** Wrong guesses so far. A code is thrown away after too many. */
  attempts: number;
  createdAt: Date;
}

const emailVerificationSchema = new Schema<EmailVerificationDocument>({
  email: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, enum: VERIFICATION_PURPOSES, required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: () => new Date() },
});

emailVerificationSchema.index({ email: 1, purpose: 1 }, { unique: true });
emailVerificationSchema.index({ tokenHash: 1 });
// MongoDB deletes the row as soon as `expiresAt` passes.
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailVerification = model<EmailVerificationDocument>(
  'EmailVerification',
  emailVerificationSchema
);
