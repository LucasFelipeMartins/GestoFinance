import { Link2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { ActionsMenu } from '@/components/ui/ActionsMenu';
import { FinanceEntry } from '@/types';
import { FINANCE_META } from '@/utils/financeMeta';
import { describePayment, isBillOverdue } from '@/utils/finance';
import { isDerivedEntry } from '@/repositories/financeRepository';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { SeriesMarkKey } from './SeriesMark';
import { buildActions, AutoBadge } from './FinanceEntryTable';

interface FinanceEntryCardProps {
  entry: FinanceEntry;
  onEdit: (entry: FinanceEntry) => void;
  onDelete: (entry: FinanceEntry) => void;
  onTogglePaid?: (entry: FinanceEntry) => void;
  onSimulate?: (entry: FinanceEntry) => void;
  onOpenClient?: (clientId: string) => void;
  clientName?: (clientId: string) => string | undefined;
}

/** The mobile row. Same data as the table, stacked so nothing is cut off. */
export function FinanceEntryCard({
  entry,
  onEdit,
  onDelete,
  onTogglePaid,
  onSimulate,
  onOpenClient,
  clientName,
}: FinanceEntryCardProps) {
  const meta = FINANCE_META[entry.kind];
  const isExpense = entry.kind === 'expense';
  const overdue = isBillOverdue(entry);
  const linkedClient = entry.clientId ? clientName?.(entry.clientId) : undefined;

  return (
    <article className="rounded-card border border-border bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        {isExpense && (
          <Checkbox
            checked={entry.paid}
            onCheckedChange={() => onTogglePaid?.(entry)}
            label={`Marcar "${entry.description}" como paga`}
            hideLabel
            size="sm"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className={`truncate text-body-strong ${
                  entry.paid && isExpense ? 'text-text-secondary line-through' : 'text-text-primary'
                }`}
              >
                {entry.description}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-caption text-text-secondary">
                <SeriesMarkKey shape={meta.shape} color={meta.color} size={10} />
                {meta.dateLabel} {formatDate(entry.date)}
              </p>
            </div>
            <span className="shrink-0 text-h3 tabular-nums text-text-primary">
              {formatCurrency(entry.amount)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isDerivedEntry(entry) && <AutoBadge />}
            {overdue && <Badge tone="danger">Vencida</Badge>}
            {isExpense && !overdue && (
              <Badge tone={entry.paid ? 'success' : 'warning'}>{entry.paid ? 'Paga' : 'Em aberto'}</Badge>
            )}
            {isExpense && (
              <span className="text-caption text-text-secondary">
                {describePayment(entry, formatCurrency)}
              </span>
            )}
            {entry.kind === 'investment' && entry.cdiPercent != null && (
              <Badge tone="neutral">{entry.cdiPercent}% do CDI</Badge>
            )}
            {linkedClient && (
              <span className="inline-flex items-center gap-1 text-caption text-text-secondary">
                <Link2 size={12} className="text-sage-green" />
                {linkedClient}
              </span>
            )}
            {entry.category && <Badge tone="neutral">{entry.category}</Badge>}
          </div>
        </div>

        <div className="-mr-2 -mt-1 shrink-0">
          <ActionsMenu items={buildActions(entry, onEdit, onDelete, onSimulate, onOpenClient)} />
        </div>
      </div>
    </article>
  );
}
