import { Schema, model, Document, Types } from 'mongoose';

/**
 * A "cofrinho": a named pot the person puts investments into — "Reserva de
 * emergência", "Viagem" — with its own yield (% do CDI). The money itself is
 * the investment entries that reference it (FinanceEntry.boxId); the box
 * only holds the name, the rate and the colour. Its balance is derived, so
 * two devices depositing offline both survive.
 */
export interface InvestmentBoxDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Client-generated UUID. The stable, public identifier. */
  localId: string;
  name: string;
  /** Percentage OF the CDI the pot yields (100 = 100% do CDI). */
  cdiPercent: number;
  /** One of the client's palette keys ("sage", "blue", ...). */
  color: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const investmentBoxSchema = new Schema<InvestmentBoxDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  localId: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  cdiPercent: { type: Number, required: true, min: 0, default: 100 },
  color: { type: String, required: true, default: 'sage' },
  notes: { type: String, trim: true },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
});

investmentBoxSchema.index({ userId: 1, localId: 1 }, { unique: true });

export const InvestmentBox = model<InvestmentBoxDocument>('InvestmentBox', investmentBoxSchema);
