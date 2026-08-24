export const PRIORITIES = ['critical', 'high', 'medium', 'low', 'very-low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ['pending', 'in-progress', 'completed'] as const;
export type EntityStatus = (typeof STATUSES)[number];

export const PRIORITY_RANK: Record<Priority, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
  'very-low': 5,
};

/** The three financial ledgers the Finanças module keeps. They share one
 * collection because the fields overlap almost entirely — `kind` is the
 * discriminator, and only a handful of fields are kind-specific. */
export const FINANCE_KINDS = ['income', 'expense', 'investment'] as const;
export type FinanceKind = (typeof FINANCE_KINDS)[number];

/** How an expense gets paid. `card` is the only one that carries parcelas. */
export const PAYMENT_METHODS = ['pix', 'card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
