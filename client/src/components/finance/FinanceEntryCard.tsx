import { Link2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { ActionsMenu } from '@/components/ui/ActionsMenu';
import { FinanceEntry } from '@/types';
import { FINANCE_META } from '@/utils/financeMeta';
import { describePayment, isBillOverdue, isInstallmentPlan, nextInstallment } from '@/utils/finance';
import { isDerivedEntry } from '@/repositories/financeRepository';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { SeriesMarkKey } from './SeriesMark';
import { buildActions, AutoBadge, InstallmentProgress, paidToggleLabel } from './FinanceEntryTable';

interface FinanceEntryCardProps {
  entry: FinanceEntry;
  onEdit: (entry: FinanceEntry) => void;
  onDelete: (entry: FinanceEntry) => void;
  onTogglePaid?: (entry: FinanceEntry) => void;
  onUndoInstallment?: (entry: FinanceEntry) => void;
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
  onUndoInstallment,
  onSimulate,
  onOpenClient,
  clientName,
}: FinanceEntryCardProps) {
  const meta = FINANCE_META[entry.kind];
  const isExpense = entry.kind === 'expense';
  const overdue = isBillOverdue(entry);
  const next = nextInstallment(entry);
  const plan = isExpense && isInstallmentPlan(entry);
  const linkedClient = entry.clientId ? clientName?.(entry.clientId) : undefined;

  return (
    <Card padding="sm">
      <div className="flex items-start gap-2">
        {isExpense && (
          <div className="-ml-2 -mt-2">
            <Checkbox
              checked={entry.paid}
              onCheckedChange={() => onTogglePaid?.(entry)}
              label={paidToggleLabel(entry)}
              hideLabel
              size="sm"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
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
                {plan && next ? `Parcela ${next.number} de ${next.total} vence em` : meta.dateLabel}{' '}
                {formatDate(next?.dueDate ?? entry.date)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-h3 tabular-nums text-text-primary">
                {formatCurrency(next ? next.value : entry.amount)}
              </span>
              {plan && (
                <span className="block text-caption tabular-nums text-text-secondary">
                  total {formatCurrency(entry.amount)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isDerivedEntry(entry) && <AutoBadge />}
            {overdue && <Badge tone="danger">Atrasada</Badge>}
            {isExpense && !overdue && (
              <Badge tone={entry.paid ? 'success' : 'warning'}>{entry.paid ? 'Paga' : 'A pagar'}</Badge>
            )}
            {isExpense && (
              <span className="text-caption text-text-secondary">{describePayment(entry, formatCurrency)}</span>
            )}
            {entry.kind === 'investment' && entry.cdiPercent != null && (
              <Badge tone="info">{entry.cdiPercent}% do CDI</Badge>
            )}
            {linkedClient && (
              <span className="inline-flex items-center gap-1 text-caption text-text-secondary">
                <Link2 size={12} className="text-sage-green" />
                {linkedClient}
              </span>
            )}
            {entry.category && <Badge tone="neutral">{entry.category}</Badge>}
          </div>

          {plan && (
            <div className="mt-2">
              <InstallmentProgress entry={entry} />
            </div>
          )}
        </div>

        <div className="-mr-2 -mt-1.5 shrink-0">
          <ActionsMenu
            items={buildActions(entry, { onEdit, onDelete, onTogglePaid, onUndoInstallment, onSimulate, onOpenClient })}
          />
        </div>
      </div>
    </Card>
  );
}
