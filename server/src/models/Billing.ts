import { Schema, model, Document, Types } from 'mongoose';

/**
 * An e-mail the owner has exempted from paying — for themselves, family, a
 * partner. Keyed by e-mail rather than user id so it can be granted before
 * the person has even created the account.
 */
export interface FreeAccountDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  note?: string;
  addedBy: string;
  createdAt: Date;
}

const freeAccountSchema = new Schema<FreeAccountDocument>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  note: { type: String, trim: true },
  addedBy: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
});

export const FreeAccount = model<FreeAccountDocument>('FreeAccount', freeAccountSchema);

/**
 * One Mercado Pago payment as we last saw it. Its job is idempotency: the
 * webhook and the "voltei do checkout" confirmation can both report the
 * same payment, and access must be extended exactly once.
 */
export interface PaymentDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Mercado Pago's payment id. */
  providerPaymentId: string;
  status: string;
  amount?: number;
  /** pix, credit_card, debit_card, ticket (boleto)… */
  method?: string;
  /** Set once the payment was approved and access extended. */
  appliedAt?: Date;
  periodStart?: Date;
  periodEnd?: Date;
  /** Set once a refund/chargeback took the period back. */
  revokedAt?: Date;
  /** Why an approved payment was NOT applied (wrong amount/currency). */
  issue?: string;
  /** 'subscription' when the charge came from the card subscription. */
  kind?: 'single' | 'subscription';
  preapprovalId?: string;
  /** Refund we asked for when the person cancelled (pro rata of unused days). */
  refundAmount?: number;
  /** requested | done | manual (boleto: has to be paid back by hand) | failed */
  refundStatus?: string;
  refundRequestedAt?: Date;
  refundNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    providerPaymentId: { type: String, required: true, unique: true },
    status: { type: String, required: true },
    amount: { type: Number },
    method: { type: String },
    appliedAt: { type: Date },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    revokedAt: { type: Date },
    issue: { type: String },
    kind: { type: String, enum: ['single', 'subscription'] },
    preapprovalId: { type: String },
    refundAmount: { type: Number },
    refundStatus: { type: String },
    refundRequestedAt: { type: Date },
    refundNote: { type: String },
  },
  { timestamps: true }
);

export const Payment = model<PaymentDocument>('Payment', paymentSchema);
