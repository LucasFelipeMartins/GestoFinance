import { FinanceKind } from '@/types';

/**
 * Marker shape per ledger. This is not decoration: receita (verde) and
 * despesa (vermelho) sit at CVD ΔE 7.2 — inside the 6–8 floor band — so
 * wherever the three appear together the shape, not the colour, is what
 * tells them apart. See the `finance` block in tailwind.config.ts for the
 * full validation note.
 */
export type SeriesShape = 'circle' | 'square' | 'triangle';

export interface FinanceKindMeta {
  /** Singular, for one registro. */
  label: string;
  /** Plural, for a page title or a legend key. */
  plural: string;
  /**
   * The mark colour — lines, markers, chips — as a CSS colour string that
   * follows the theme. Never applied to body text. Use it in `style`, not
   * in SVG presentation attributes (those can't resolve var()).
   */
  color: string;
  /** Tint for tiles and badges. */
  soft: string;
  /** Tailwind classes for the same two colours, for className use. */
  textClass: string;
  softBgClass: string;
  shape: SeriesShape;
  route: string;
  /** What the `date` field means for this ledger. */
  dateLabel: string;
  /** Short explanation for the tiles/empty states, in plain words. */
  description: string;
}

export const FINANCE_META: Record<FinanceKind, FinanceKindMeta> = {
  income: {
    label: 'Receita',
    plural: 'Receitas',
    color: 'rgb(var(--c-fin-income))',
    soft: 'rgb(var(--c-fin-income-soft))',
    textClass: 'text-finance-income',
    softBgClass: 'bg-finance-income-soft',
    shape: 'circle',
    route: '/receitas',
    dateLabel: 'Recebido em',
    description: 'Dinheiro que entrou',
  },
  expense: {
    label: 'Despesa',
    plural: 'Despesas',
    color: 'rgb(var(--c-fin-expense))',
    soft: 'rgb(var(--c-fin-expense-soft))',
    textClass: 'text-finance-expense',
    softBgClass: 'bg-finance-expense-soft',
    shape: 'square',
    route: '/despesas',
    dateLabel: 'Vence em',
    description: 'Dinheiro que saiu ou vai sair',
  },
  investment: {
    label: 'Investimento',
    plural: 'Investimentos',
    color: 'rgb(var(--c-fin-investment))',
    soft: 'rgb(var(--c-fin-investment-soft))',
    textClass: 'text-finance-investment',
    softBgClass: 'bg-finance-investment-soft',
    shape: 'triangle',
    route: '/investimentos',
    dateLabel: 'Aplicado em',
    description: 'Dinheiro guardado rendendo',
  },
};

/** Fixed order — never re-derived from the data, so filtering a series out
 * never repaints the survivors. */
export const FINANCE_KIND_ORDER: FinanceKind[] = ['income', 'expense', 'investment'];
