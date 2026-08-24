import { FinanceKind } from '@/types';

/**
 * Marker shape per ledger. This is not decoration: lucro (verde) and gasto
 * (vermelho) sit at CVD ΔE 7.2 — inside the 6–8 floor band — so wherever the
 * three appear together the shape, not the colour, is what tells them apart.
 * See the `finance` block in tailwind.config.ts for the full validation note.
 */
export type SeriesShape = 'circle' | 'square' | 'triangle';

export interface FinanceKindMeta {
  /** Singular, for one lançamento. */
  label: string;
  /** Plural, for a page title or a legend key. */
  plural: string;
  /** The mark colour — lines, markers, chips. Never applied to body text. */
  color: string;
  /** Tint for tiles and badges. */
  soft: string;
  shape: SeriesShape;
  route: string;
  /** What the `date` field means for this ledger. */
  dateLabel: string;
}

export const FINANCE_META: Record<FinanceKind, FinanceKindMeta> = {
  income: {
    label: 'Lucro',
    plural: 'Lucros',
    color: '#008300',
    soft: '#E2F3E0',
    shape: 'circle',
    route: '/lucros',
    dateLabel: 'Recebido em',
  },
  expense: {
    label: 'Despesa',
    plural: 'Despesas',
    color: '#E34948',
    soft: '#FDEAEA',
    shape: 'square',
    route: '/despesas',
    dateLabel: 'Vence em',
  },
  investment: {
    label: 'Investimento',
    plural: 'Investimentos',
    color: '#2A78D6',
    soft: '#E6F0FC',
    shape: 'triangle',
    route: '/investimentos',
    dateLabel: 'Aplicado em',
  },
};

/** Fixed order — never re-derived from the data, so filtering a series out
 * never repaints the survivors. */
export const FINANCE_KIND_ORDER: FinanceKind[] = ['income', 'expense', 'investment'];
