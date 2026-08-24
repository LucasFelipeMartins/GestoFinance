import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowUpRight, Wallet, PiggyBank, Receipt } from 'lucide-react';
import { FinanceKind } from '@/types';
import { FinanceTotals } from '@/utils/finance';
import { FINANCE_META, FINANCE_KIND_ORDER } from '@/utils/financeMeta';
import { formatCurrency } from '@/utils/formatters';
import { SeriesMarkKey } from './SeriesMark';

const KIND_ICON: Record<FinanceKind, ReactNode> = {
  income: <TrendingUp size={18} />,
  expense: <Receipt size={18} />,
  investment: <PiggyBank size={18} />,
};

interface TileProps {
  label: string;
  value: string;
  caption: string;
  icon: ReactNode;
  /** Tint behind the icon chip. */
  soft: string;
  color: string;
  markKey?: ReactNode;
  to?: string;
}

function Tile({ label, value, caption, icon, soft, color, markKey, to }: TileProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-caption font-semibold text-text-secondary">
          {markKey}
          {label}
        </span>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
          style={{ backgroundColor: soft, color }}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-h2 tabular-nums text-text-primary">{value}</p>
      <p className="mt-0.5 truncate text-caption text-text-secondary">{caption}</p>
    </>
  );

  const shell =
    'rounded-card border border-border bg-white p-4 shadow-card transition-all duration-200 ease-gentle sm:p-5';

  if (!to) return <div className={shell}>{body}</div>;

  return (
    <Link
      to={to}
      className={`${shell} group block hover:-translate-y-0.5 hover:shadow-elevated focus-visible:outline-2 focus-visible:outline-sage-green`}
    >
      {body}
      <span className="mt-2 inline-flex items-center gap-1 text-caption font-semibold text-sage-green opacity-0 transition-opacity group-hover:opacity-100">
        Abrir
        <ArrowUpRight size={13} />
      </span>
    </Link>
  );
}

interface FinanceKpisProps {
  totals: FinanceTotals;
  /** Label for the period the numbers cover, e.g. "Agosto de 2026". */
  periodLabel: string;
}

/**
 * The headline panel: lucros, gastos e investimentos of the current month in
 * plain numbers, plus the resulting saldo.
 *
 * The value itself always wears ink, never the series colour — the coloured
 * shape beside the label is what carries identity, matching the chart keys.
 */
export function FinanceKpis({ totals, periodLabel }: FinanceKpisProps) {
  const positive = totals.net >= 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {FINANCE_KIND_ORDER.map((kind) => {
        const meta = FINANCE_META[kind];
        return (
          <Tile
            key={kind}
            label={meta.plural}
            value={formatCurrency(totals[kind])}
            caption={periodLabel}
            icon={KIND_ICON[kind]}
            soft={meta.soft}
            color={meta.color}
            markKey={<SeriesMarkKey shape={meta.shape} color={meta.color} withLine />}
            to={meta.route}
          />
        );
      })}

      <Tile
        label="Saldo do mês"
        value={formatCurrency(totals.net)}
        caption={positive ? 'Lucros acima dos gastos' : 'Gastos acima dos lucros'}
        icon={positive ? <Wallet size={18} /> : <TrendingDown size={18} />}
        soft={positive ? '#E7F2E4' : '#FDEAEA'}
        color={positive ? '#3F7A3D' : '#C23131'}
      />
    </div>
  );
}
