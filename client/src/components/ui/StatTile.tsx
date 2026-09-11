import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { CARD_CLASS } from './Card';

interface StatTileProps {
  label: string;
  value: string;
  caption?: string;
  /** Icon chip in the corner; tinted with `soft` / `color` when given. */
  icon?: ReactNode;
  color?: string;
  soft?: string;
  /** Small marker rendered before the label (the chart legend key). */
  markKey?: ReactNode;
  /** Colours the value red — for overdue amounts and the like. */
  attention?: boolean;
  /** Makes the whole tile a link. */
  to?: string;
  /** Thin accent bar at the bottom, in this colour. */
  accent?: string;
}

/**
 * The one stat tile. Every summary strip (Home, Receitas, Despesas,
 * Investimentos, Metas) uses this exact box, so the numbers line up across
 * pages instead of each page inventing its own padding and type size.
 */
export function StatTile({ label, value, caption, icon, color, soft, markKey, attention, to, accent }: StatTileProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-h-[20px] items-center gap-2 text-caption font-semibold uppercase tracking-wide text-text-secondary">
          {markKey}
          {label}
        </span>
        {icon && (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-tint text-sage-green"
            style={soft || color ? { backgroundColor: soft, color } : undefined}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      <p className={`mt-2 text-h2 tabular-nums ${attention ? 'text-danger' : 'text-text-primary'}`}>{value}</p>
      <p className="mt-0.5 min-h-[17px] truncate text-caption text-text-secondary">{caption ?? ' '}</p>
      {accent && <span className="mt-3 block h-0.5 w-9 rounded-full" style={{ backgroundColor: accent }} />}
    </>
  );

  const shell = `${CARD_CLASS} flex flex-col p-4 sm:p-5`;

  if (!to) return <div className={shell}>{body}</div>;

  return (
    <Link
      to={to}
      className={`${shell} group transition-all duration-200 ease-gentle hover:-translate-y-0.5 hover:shadow-elevated focus-visible:outline-2 focus-visible:outline-sage-green`}
    >
      {body}
      <span className="mt-2 inline-flex items-center gap-1 text-caption font-semibold text-sage-green opacity-0 transition-opacity group-hover:opacity-100">
        Abrir
        <ArrowUpRight size={13} />
      </span>
    </Link>
  );
}

/** Responsive strip for 3–5 tiles: two columns on phones, everything in a
 * row from tablet up. */
export function StatGrid({ children, columns = 3 }: { children: ReactNode; columns?: 3 | 4 | 5 }) {
  const cols = {
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-3 lg:grid-cols-5',
  }[columns];
  return <div className={`grid grid-cols-2 gap-3 lg:gap-4 ${cols}`}>{children}</div>;
}
