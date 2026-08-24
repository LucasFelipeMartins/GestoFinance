import { Schema, model, Document, Types } from 'mongoose';
import { FINANCE_KINDS, PAYMENT_METHODS, FinanceKind, PaymentMethod } from '../types/enums';

export interface FinanceEntryDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Client-generated UUID. The stable, public identifier. */
  localId: string;
  kind: FinanceKind;
  description: string;
  /** Always the FULL value in BRL, never a parcela — the monthly share of a
   * card purchase is derived (amount / installments), so editing the total
   * never leaves the parcelas stale. */
  amount: number;
  /**
   * What the date means depends on `kind`: income → when it was received,
   * expense → when it falls due, investment → when it was applied.
   */
  date: Date;
  category?: string;
  notes?: string;
  /** References Client.localId (a plain string, same convention as Task) —
   * optional link so a receita can point at the job that produced it. */
  clientId?: string;

  // --- expense-only ---
  paid: boolean;
  paidAt?: Date;
  paymentMethod?: PaymentMethod;
  /** 1 for pix or a single-shot card charge; > 1 spreads the amount across
   * that many months starting at `date`. */
  installments?: number;

  // --- investment-only ---
  /** Percentage OF the CDI the application yields (e.g. 110 = 110% do CDI),
   * which is how Brazilian fixed income is actually quoted. */
  cdiPercent?: number;

  createdAt: Date;
  updatedAt: Date;
}

const financeEntrySchema = new Schema<FinanceEntryDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  localId: { type: String, required: true },
  kind: { type: String, enum: FINANCE_KINDS, required: true },
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  category: { type: String, trim: true },
  notes: { type: String, trim: true },
  clientId: { type: String },
  paid: { type: Boolean, default: false },
  paidAt: { type: Date },
  paymentMethod: { type: String, enum: PAYMENT_METHODS },
  installments: { type: Number, min: 1, max: 120 },
  cdiPercent: { type: Number, min: 0 },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
});

financeEntrySchema.index({ userId: 1, localId: 1 }, { unique: true });
financeEntrySchema.index({ userId: 1, kind: 1, date: -1 });
financeEntrySchema.index({ userId: 1, kind: 1, paid: 1 });

export const FinanceEntry = model<FinanceEntryDocument>('FinanceEntry', financeEntrySchema);
