import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, Receipt, Pencil, CreditCard, Smartphone } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePayInstallment, useSetFinancePaid } from '@/hooks/useFinance';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { FinanceEntry } from '@/types';
import { BillsSummary, isBillOverdue, isInstallmentPlan, nextInstallment } from '@/utils/finance';
import { formatCurrency, formatRelativeDate } from '@/utils/formatters';
import { FinanceFormModal } from './FinanceFormModal';
import { paidToggleLabel } from './FinanceEntryTable';

interface BillsPanelProps {
  bills: FinanceEntry[];
  summary: BillsSummary;
  /** Open parcelas due this month, added up. */
  pendingThisMonth: number;
  /** How many rows to show before deferring to the Despesas page. */
  limit?: number;
}

/**
 * Contas a pagar, right on Home: what is due next, what is already late,
 * and a one-tap way to add another or tick one off as paid.
 *
 * A parcelado shows up as its next parcela only — "parcela 3 de 4, R$ 100" —
 * because that is the amount actually leaving the account this month.
 * Ticking it settles that parcela and the row moves on to the next one.
 */
export function BillsPanel({ bills, summary, pendingThisMonth, limit = 6 }: BillsPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | undefined>();
  const setPaid = useSetFinancePaid();
  const payInstallment = usePayInstallment();
  const toast = useToast();

  const visible = bills.slice(0, limit);

  const openAdd = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (entry: FinanceEntry) => {
    setEditing(entry);
    setFormOpen(true);
  };

  const handlePay = async (entry: FinanceEntry) => {
    try {
      if (isInstallmentPlan(entry)) {
        const next = nextInstallment(entry);
        await payInstallment.mutateAsync(entry.id);
        const last = next ? next.number >= next.total : true;
        toast.success(last ? 'Última parcela paga — despesa quitada.' : `Parcela ${next?.number} paga.`);
        return;
      }
      await setPaid.mutateAsync({ id: entry.id, paid: true });
      toast.success('Despesa marcada como paga.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível atualizar a despesa.'));
    }
  };

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-h3 text-text-primary">
            <Receipt size={19} className="text-finance-expense" />
            Contas a pagar
          </h3>
          <p className="mt-0.5 text-caption text-text-secondary">
            {summary.openCount === 0
              ? 'Nada pendente no momento'
              : `Falta pagar ${formatCurrency(pendingThisMonth)} este mês · ${summary.openCount} conta${
                  summary.openCount > 1 ? 's' : ''
                } em aberto`}
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus size={16} />} onClick={openAdd}>
          Adicionar
        </Button>
      </div>

      {(summary.overdueCount > 0 || summary.dueSoonCount > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.overdueCount > 0 && (
            <Badge tone="danger">
              {summary.overdueCount} atrasada{summary.overdueCount > 1 ? 's' : ''} ·{' '}
              {formatCurrency(summary.overdueTotal)}
            </Badge>
          )}
          {summary.dueSoonCount > 0 && (
            <Badge tone="warning">
              {summary.dueSoonCount} vence{summary.dueSoonCount > 1 ? 'm' : ''} em até 7 dias
            </Badge>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-input border border-dashed border-border px-4 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-finance-expense-soft text-finance-expense">
            <Receipt size={20} />
          </span>
          <p className="text-body text-text-secondary">
            Nenhuma conta em aberto. Adicione o que precisa ser pago para não perder o prazo.
          </p>
          <Button size="sm" variant="secondary" leftIcon={<Plus size={16} />} onClick={openAdd}>
            Adicionar conta
          </Button>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {visible.map((entry) => {
            const overdue = isBillOverdue(entry);
            const byCard = entry.paymentMethod === 'card';
            const next = nextInstallment(entry);
            const plan = isInstallmentPlan(entry);
            return (
              <li key={entry.id} className="flex items-center gap-2 py-2.5">
                <div className="-ml-2">
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => handlePay(entry)}
                    label={paidToggleLabel(entry)}
                    hideLabel
                    size="sm"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-strong text-text-primary">{entry.description}</p>
                  <p className="flex items-center gap-1.5 truncate text-caption text-text-secondary">
                    {byCard ? <CreditCard size={12} /> : <Smartphone size={12} />}
                    {plan && next
                      ? `Cartão · parcela ${next.number} de ${next.total}`
                      : byCard
                        ? 'Cartão · à vista'
                        : 'Pix / dinheiro'}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end">
                  <span className="text-body-strong tabular-nums text-text-primary">
                    {formatCurrency(next ? next.value : entry.amount)}
                  </span>
                  <span className={`text-caption ${overdue ? 'font-semibold text-danger' : 'text-text-secondary'}`}>
                    {overdue ? 'Atrasada' : next ? formatRelativeDate(next.dueDate) : formatRelativeDate(entry.date)}
                  </span>
                </div>

                <IconButton
                  icon={<Pencil size={16} />}
                  label={`Editar ${entry.description}`}
                  onClick={() => openEdit(entry)}
                  className="-mr-2"
                />
              </li>
            );
          })}
        </ul>
      )}

      {bills.length > visible.length && (
        <Link
          to="/despesas"
          className="mt-4 inline-flex items-center gap-1 self-start text-body-strong text-sage-green hover:underline"
        >
          Ver todas as {bills.length} contas
          <ArrowRight size={15} />
        </Link>
      )}

      <FinanceFormModal open={formOpen} onOpenChange={setFormOpen} entry={editing} lockedKind="expense" />
    </Card>
  );
}
