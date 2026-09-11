import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Receipt } from 'lucide-react';
import { FinanceKind } from '@/types';
import { FinanceTotals } from '@/utils/finance';
import { FINANCE_META, FINANCE_KIND_ORDER } from '@/utils/financeMeta';
import { formatCurrency } from '@/utils/formatters';
import { StatGrid, StatTile } from '@/components/ui/StatTile';
import { SeriesMarkKey } from './SeriesMark';

const KIND_ICON: Record<FinanceKind, ReactNode> = {
  income: <TrendingUp size={18} />,
  expense: <Receipt size={18} />,
  investment: <PiggyBank size={18} />,
};

interface FinanceKpisProps {
  totals: FinanceTotals;
  /** Label for the period the numbers cover, e.g. "Agosto de 2026". */
  periodLabel: string;
}

/** "Setembro de 2026" → "Setembro": the year is already in the page eyebrow. */
function shortPeriod(label: string): string {
  return label.split(' de ')[0] ?? label;
}

/**
 * The headline panel: receitas, despesas e investimentos of the current
 * month in plain numbers, plus the lucro they leave (receitas − despesas).
 *
 * The value itself always wears ink, never the series colour — the coloured
 * shape beside the label is what carries identity, matching the chart keys.
 */
export function FinanceKpis({ totals, periodLabel }: FinanceKpisProps) {
  const positive = totals.net >= 0;

  return (
    <StatGrid columns={4}>
      {FINANCE_KIND_ORDER.map((kind) => {
        const meta = FINANCE_META[kind];
        return (
          <StatTile
            key={kind}
            label={meta.plural}
            value={formatCurrency(totals[kind])}
            caption={meta.description}
            icon={KIND_ICON[kind]}
            soft={meta.soft}
            color={meta.color}
            markKey={<SeriesMarkKey shape={meta.shape} color={meta.color} withLine />}
            to={meta.route}
          />
        );
      })}

      <StatTile
        label={`Lucro de ${shortPeriod(periodLabel).toLowerCase()}`}
        value={formatCurrency(totals.net)}
        caption={positive ? 'Receitas menos despesas' : 'Despesas maiores que as receitas'}
        icon={positive ? <Wallet size={18} /> : <TrendingDown size={18} />}
        soft={positive ? 'rgb(var(--c-tint))' : 'rgb(var(--c-fin-expense-soft))'}
        color={positive ? 'rgb(var(--c-sage))' : 'rgb(var(--c-danger))'}
        attention={!positive}
      />
    </StatGrid>
  );
}
