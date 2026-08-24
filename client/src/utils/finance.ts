import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FinanceEntry, FinanceKind } from '@/types';

/* ------------------------------------------------------------------ */
/* Month bucketing                                                     */
/* ------------------------------------------------------------------ */

export interface MonthBucket {
  /** 'YYYY-MM' — stable key, independent of locale. */
  key: string;
  /** Axis label: 'ago'. */
  label: string;
  /** Tooltip label: 'Agosto de 2026'. */
  fullLabel: string;
  income: number;
  expense: number;
  investment: number;
  /** income − expense for the month. Investimento is money moved, not
   * spent, so it deliberately stays out of this. */
  net: number;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Which months a lançamento lands in, and how much in each.
 *
 * Everything except a parcelled card despesa hits a single month. A card
 * despesa in N parcelas spreads `amount / N` across the N months starting at
 * its date — so a R$ 1.200 purchase in 12x reads as R$ 100 per month on the
 * chart instead of a single spike that never matches the real bill.
 */
export function monthlyShares(entry: FinanceEntry): { key: string; value: number }[] {
  const start = new Date(entry.date);
  if (Number.isNaN(start.getTime())) return [];

  const parcels =
    entry.kind === 'expense' && entry.paymentMethod === 'card'
      ? Math.max(1, Math.round(entry.installments ?? 1))
      : 1;

  const value = entry.amount / parcels;
  return Array.from({ length: parcels }, (_, i) => ({
    key: monthKey(new Date(start.getFullYear(), start.getMonth() + i, 1)),
    value,
  }));
}

/** The last `count` months, oldest first, ending on the current month. */
export function lastMonths(count: number, reference = new Date()): Date[] {
  return Array.from(
    { length: count },
    (_, i) => new Date(reference.getFullYear(), reference.getMonth() - (count - 1 - i), 1)
  );
}

/**
 * Totals per month for the Home chart. Months with no lançamento still come
 * back (as zeros) so the x-axis is a continuous timeline rather than a list
 * of whichever months happen to have data.
 */
export function buildMonthlySeries(
  entries: FinanceEntry[],
  count = 5,
  reference = new Date()
): MonthBucket[] {
  const buckets = new Map<string, MonthBucket>();

  for (const monthStart of lastMonths(count, reference)) {
    const key = monthKey(monthStart);
    const full = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });
    buckets.set(key, {
      key,
      label: format(monthStart, 'MMM', { locale: ptBR }).replace('.', ''),
      fullLabel: full.charAt(0).toUpperCase() + full.slice(1),
      income: 0,
      expense: 0,
      investment: 0,
      net: 0,
    });
  }

  for (const entry of entries) {
    for (const share of monthlyShares(entry)) {
      const bucket = buckets.get(share.key);
      if (!bucket) continue;
      bucket[entry.kind] += share.value;
    }
  }

  const series = [...buckets.values()];
  series.forEach((bucket) => {
    bucket.net = bucket.income - bucket.expense;
  });
  return series;
}

/* ------------------------------------------------------------------ */
/* Headline totals                                                     */
/* ------------------------------------------------------------------ */

export interface FinanceTotals {
  income: number;
  expense: number;
  investment: number;
  /** income − expense. */
  net: number;
}

/** Totals for one month — what the panel at the top of Home reports. */
export function totalsForMonth(entries: FinanceEntry[], reference = new Date()): FinanceTotals {
  const key = monthKey(new Date(reference.getFullYear(), reference.getMonth(), 1));
  const totals: FinanceTotals = { income: 0, expense: 0, investment: 0, net: 0 };

  for (const entry of entries) {
    for (const share of monthlyShares(entry)) {
      if (share.key !== key) continue;
      totals[entry.kind] += share.value;
    }
  }

  totals.net = totals.income - totals.expense;
  return totals;
}

/** Straight sum of every entry of one kind, ignoring the calendar. Used for
 * the all-time figures on the individual ledger pages. */
export function sumBy(entries: FinanceEntry[], kind: FinanceKind): number {
  return entries.filter((e) => e.kind === kind).reduce((total, e) => total + e.amount, 0);
}

/* ------------------------------------------------------------------ */
/* Contas a pagar                                                      */
/* ------------------------------------------------------------------ */

export interface BillsSummary {
  /** Everything still unpaid, at full value. */
  openTotal: number;
  openCount: number;
  overdueCount: number;
  overdueTotal: number;
  /** Unpaid and falling due within the next 7 days (today included). */
  dueSoonCount: number;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function summarizeBills(entries: FinanceEntry[], reference = new Date()): BillsSummary {
  const today = startOfDay(reference);
  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const summary: BillsSummary = {
    openTotal: 0,
    openCount: 0,
    overdueCount: 0,
    overdueTotal: 0,
    dueSoonCount: 0,
  };

  for (const entry of entries) {
    if (entry.kind !== 'expense' || entry.paid) continue;

    const due = startOfDay(new Date(entry.date));
    summary.openTotal += entry.amount;
    summary.openCount += 1;

    if (due < today) {
      summary.overdueCount += 1;
      summary.overdueTotal += entry.amount;
    } else if (due <= weekAhead) {
      summary.dueSoonCount += 1;
    }
  }

  return summary;
}

/** True when an unpaid despesa's due date is already behind us. */
export function isBillOverdue(entry: FinanceEntry, reference = new Date()): boolean {
  if (entry.kind !== 'expense' || entry.paid) return false;
  return startOfDay(new Date(entry.date)) < startOfDay(reference);
}

/** How a despesa gets paid, in one line: 'Pix' or 'Cartao 3x de R$ 100,00'. */
export function describePayment(entry: FinanceEntry, formatMoney: (value: number) => string): string {
  if (entry.kind !== 'expense') return '';
  if (entry.paymentMethod !== 'card') return 'Pix';

  const parcels = Math.max(1, Math.round(entry.installments ?? 1));
  if (parcels <= 1) return 'Cartão · à vista';
  return `Cartão · ${parcels}x de ${formatMoney(entry.amount / parcels)}`;
}

/* ------------------------------------------------------------------ */
/* CDI yield simulation                                                */
/* ------------------------------------------------------------------ */

/**
 * Brazilian fixed income compounds over *business* days, not calendar days:
 * 252 in a year, ~21 in a month. Using 365/30 here would overstate the yield.
 */
export const BUSINESS_DAYS_PER_YEAR = 252;
export const BUSINESS_DAYS_PER_MONTH = 21;

/**
 * The daily rate implied by an annual CDI quote — the market's own
 * conversion, `(1 + anual) ^ (1/252) − 1`.
 */
export function cdiDailyRate(annualCdiPercent: number): number {
  return Math.pow(1 + annualCdiPercent / 100, 1 / BUSINESS_DAYS_PER_YEAR) - 1;
}

/**
 * IR regressivo on renda fixa: the longer the money stays in, the smaller the
 * bite. Brackets are counted in calendar days held.
 */
export function incomeTaxRate(calendarDays: number): number {
  if (calendarDays <= 180) return 0.225;
  if (calendarDays <= 360) return 0.2;
  if (calendarDays <= 720) return 0.175;
  return 0.15;
}

export interface YieldSimulationInput {
  /** Amount applied, in BRL. */
  principal: number;
  /** The CDI itself, annualised, as informed by the user (e.g. 14.9). */
  annualCdiPercent: number;
  /** How much OF the CDI this application pays (e.g. 110 = 110% do CDI). */
  cdiPercent: number;
  /** Horizon in months. 1 answers "quanto rende até o fim do mês". */
  months: number;
  /** LCI/LCA/poupança pay no IR — drop the tax line entirely. */
  taxExempt?: boolean;
}

export interface YieldSimulationMonth {
  month: number;
  grossBalance: number;
  grossYield: number;
}

export interface YieldSimulation {
  principal: number;
  months: number;
  /** Effective rate for one month, as a fraction (0.011 = 1,10%). */
  monthlyRate: number;
  /** Effective rate over the whole horizon, compounded. */
  periodRate: number;
  /** What this rate compounds to over 12 months. */
  effectiveAnnualRate: number;
  grossBalance: number;
  grossYield: number;
  taxRate: number;
  tax: number;
  netBalance: number;
  netYield: number;
  /** Month-by-month balances, for the projection table. */
  breakdown: YieldSimulationMonth[];
}

/**
 * How much a given amount yields at a given slice of the CDI.
 *
 * The percentual do CDI applies to the *daily* rate — that is the actual
 * market convention. Applying it to the annual rate instead (anual × 1,10)
 * would quietly inflate every result.
 */
export function simulateYield(input: YieldSimulationInput): YieldSimulation {
  const principal = Math.max(0, input.principal || 0);
  const months = Math.max(1, Math.round(input.months || 1));

  const dailyRate = cdiDailyRate(Math.max(0, input.annualCdiPercent || 0));
  const effectiveDailyRate = dailyRate * (Math.max(0, input.cdiPercent || 0) / 100);

  const monthlyRate = Math.pow(1 + effectiveDailyRate, BUSINESS_DAYS_PER_MONTH) - 1;
  const periodRate = Math.pow(1 + monthlyRate, months) - 1;

  const breakdown: YieldSimulationMonth[] = Array.from({ length: months }, (_, i) => {
    const grossBalance = principal * Math.pow(1 + monthlyRate, i + 1);
    return { month: i + 1, grossBalance, grossYield: grossBalance - principal };
  });

  const grossBalance = principal * (1 + periodRate);
  const grossYield = grossBalance - principal;

  // The IR brackets count calendar days, so months are converted at the
  // average month length (30.44), not a flat 30. It matters exactly at the
  // boundaries: 12 months is 365 days (17,5%), not 360 (20%).
  const taxRate = input.taxExempt ? 0 : incomeTaxRate(Math.round(months * 30.44));
  const tax = grossYield * taxRate;

  return {
    principal,
    months,
    monthlyRate,
    periodRate,
    effectiveAnnualRate: Math.pow(1 + monthlyRate, 12) - 1,
    grossBalance,
    grossYield,
    taxRate,
    tax,
    netBalance: grossBalance - tax,
    netYield: grossYield - tax,
    breakdown,
  };
}

/** 12,34% — a fraction rendered the way rates are quoted here. */
export function formatRate(value: number, digits = 2): string {
  return `${(value * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/* ------------------------------------------------------------------ */
/* CDI preference (shared by the simulator and the Investimentos page)  */
/* ------------------------------------------------------------------ */

export const CDI_STORAGE_KEY = 'gestorpro:cdi-anual';

/** Only a starting point — whatever the user types replaces it from then on. */
export const DEFAULT_ANNUAL_CDI = 14.9;

export function readStoredAnnualCdi(): number {
  try {
    const raw = localStorage.getItem(CDI_STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ANNUAL_CDI;
  } catch {
    return DEFAULT_ANNUAL_CDI;
  }
}

export function storeAnnualCdi(value: number): void {
  try {
    if (value > 0) localStorage.setItem(CDI_STORAGE_KEY, String(value));
  } catch {
    // Storage blocked (private window) — the field still works, it just
    // won't be remembered between visits.
  }
}

/**
 * What the whole investment portfolio is expected to yield in a month, at
 * each application's own percentual do CDI. An estimate, not a statement:
 * it assumes the informed CDI holds and ignores taxes.
 */
export function estimateMonthlyYield(entries: FinanceEntry[], annualCdiPercent: number): number {
  const dailyRate = cdiDailyRate(annualCdiPercent);

  return entries
    .filter((entry) => entry.kind === 'investment')
    .reduce((total, entry) => {
      const share = Math.max(0, entry.cdiPercent ?? 100) / 100;
      const monthlyRate = Math.pow(1 + dailyRate * share, BUSINESS_DAYS_PER_MONTH) - 1;
      return total + entry.amount * monthlyRate;
    }, 0);
}
