import { Pencil, Trash2, Calculator, Link2, UserCheck, Sparkles, CheckCircle2, Undo2 } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { ActionsMenu, ActionsMenuItem } from '@/components/ui/ActionsMenu';
import { useBoxes } from '@/hooks/useBoxes';
import { FinanceEntry, FinanceKind } from '@/types';
import { FINANCE_META } from '@/utils/financeMeta';
import {
  describePayment,
  installmentCount,
  isBillOverdue,
  isInstallmentPlan,
  nextInstallment,
  paidInstallmentCount,
} from '@/utils/finance';
import { isDerivedEntry } from '@/repositories/financeRepository';
import { formatCurrency, formatDate } from '@/utils/formatters';

export interface FinanceEntryListProps {
  entries: FinanceEntry[];
  kind: FinanceKind;
  onEdit: (entry: FinanceEntry) => void;
  onDelete: (entry: FinanceEntry) => void;
  /** Pix / à vista: flips paid. Parcelado: settles the next parcela. */
  onTogglePaid?: (entry: FinanceEntry) => void;
  /** Reopens the last parcela marked as paid. */
  onUndoInstallment?: (entry: FinanceEntry) => void;
  onSimulate?: (entry: FinanceEntry) => void;
  /** Opens the Client behind a derived receita — where it is actually edited. */
  onOpenClient?: (clientId: string) => void;
  /** Resolves a linked client's name for the Receitas view. */
  clientName?: (clientId: string) => string | undefined;
}

/** Marks a receita that came from concluding a client rather than a form. */
export function AutoBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-badge bg-finance-income-soft px-2 py-0.5 text-micro font-semibold text-finance-income"
      title="Entrou sozinha quando o cliente foi concluído"
    >
      <Sparkles size={11} aria-hidden="true" />
      Automática
    </span>
  );
}

/** "2 de 4 pagas" as a tiny bar plus label — the state of a parcelado at a glance. */
export function InstallmentProgress({ entry }: { entry: FinanceEntry }) {
  const total = installmentCount(entry);
  const paid = paidInstallmentCount(entry);
  return (
    <span className="inline-flex items-center gap-2 text-caption text-text-secondary">
      <span
        className="inline-flex h-1.5 w-16 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={paid}
        aria-label={`${paid} de ${total} parcelas pagas`}
      >
        <span
          className="h-full rounded-full bg-finance-expense transition-[width] duration-500 ease-gentle"
          style={{ width: `${(paid / total) * 100}%` }}
        />
      </span>
      {paid} de {total} pagas
    </span>
  );
}

export function buildActions(
  entry: FinanceEntry,
  handlers: Pick<
    FinanceEntryListProps,
    'onEdit' | 'onDelete' | 'onTogglePaid' | 'onUndoInstallment' | 'onSimulate' | 'onOpenClient'
  >
): ActionsMenuItem[] {
  const { onEdit, onDelete, onTogglePaid, onUndoInstallment, onSimulate, onOpenClient } = handlers;

  // A derived receita has no stored row to edit or delete — it mirrors the
  // client, so the only sensible action is to go there.
  if (isDerivedEntry(entry)) {
    return entry.clientId && onOpenClient
      ? [
          {
            label: 'Abrir cliente',
            icon: <UserCheck size={17} />,
            onSelect: () => onOpenClient(entry.clientId!),
          },
        ]
      : [];
  }

  const items: ActionsMenuItem[] = [];

  if (entry.kind === 'expense' && isInstallmentPlan(entry)) {
    const next = nextInstallment(entry);
    if (next && onTogglePaid) {
      items.push({
        label: `Marcar parcela ${next.number} como paga`,
        icon: <CheckCircle2 size={17} />,
        onSelect: () => onTogglePaid(entry),
      });
    }
    if (paidInstallmentCount(entry) > 0 && onUndoInstallment) {
      items.push({
        label: 'Desfazer última parcela paga',
        icon: <Undo2 size={17} />,
        onSelect: () => onUndoInstallment(entry),
      });
    }
  }

  items.push({
    label: 'Editar',
    icon: <Pencil size={17} />,
    onSelect: () => onEdit(entry),
    separatorBefore: items.length > 0,
  });
  if (onSimulate && entry.kind === 'investment') {
    items.push({
      label: 'Simular rendimento',
      icon: <Calculator size={17} />,
      onSelect: () => onSimulate(entry),
    });
  }
  items.push({
    label: 'Remover',
    icon: <Trash2 size={17} />,
    onSelect: () => onDelete(entry),
    danger: true,
    separatorBefore: true,
  });
  return items;
}

/** The checkbox label for a despesa row, spelled out for screen readers. */
/** Name of the cofrinho an investimento sits in, for the row badge. */
export function useBoxName(): (entry: FinanceEntry) => string | undefined {
  const boxes = useBoxes().data;
  return (entry) => (entry.boxId ? boxes?.find((item) => item.box.id === entry.boxId)?.box.name : undefined);
}

export function paidToggleLabel(entry: FinanceEntry): string {
  const next = nextInstallment(entry);
  if (next && next.total > 1) {
    return `Marcar parcela ${next.number} de ${next.total} de "${entry.description}" como paga`;
  }
  return entry.paid ? `Reabrir "${entry.description}"` : `Marcar "${entry.description}" como paga`;
}

export function FinanceEntryTable({
  entries,
  kind,
  onEdit,
  onDelete,
  onTogglePaid,
  onUndoInstallment,
  onSimulate,
  onOpenClient,
  clientName,
}: FinanceEntryListProps) {
  const meta = FINANCE_META[kind];
  const isExpense = kind === 'expense';
  const isInvestment = kind === 'investment';
  const isIncome = kind === 'income';
  const handlers = { onEdit, onDelete, onTogglePaid, onUndoInstallment, onSimulate, onOpenClient };
  const boxName = useBoxName();

  return (
    <Table>
      <Thead>
        <Tr>
          {isExpense && <Th className="w-14" aria-label="Paga" />}
          <Th>Descrição</Th>
          {isIncome && <Th>Cliente</Th>}
          {isInvestment && <Th className="text-right">% do CDI</Th>}
          <Th>Categoria</Th>
          <Th>{isExpense ? 'Vencimento' : meta.dateLabel}</Th>
          {isExpense && <Th>Pagamento</Th>}
          <Th className="text-right">{isExpense ? 'A pagar' : 'Valor'}</Th>
          <Th className="w-14" aria-label="Ações" />
        </Tr>
      </Thead>
      <Tbody>
        {entries.map((entry) => {
          const overdue = isBillOverdue(entry);
          const next = nextInstallment(entry);
          const plan = isExpense && isInstallmentPlan(entry);
          return (
            <Tr key={entry.id}>
              {isExpense && (
                <Td>
                  <Checkbox
                    checked={entry.paid}
                    onCheckedChange={() => onTogglePaid?.(entry)}
                    label={paidToggleLabel(entry)}
                    hideLabel
                    size="sm"
                  />
                </Td>
              )}

              <Td>
                <div className="flex flex-col">
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-body-strong ${
                        entry.paid && isExpense ? 'text-text-secondary line-through' : 'text-text-primary'
                      }`}
                    >
                      {entry.description}
                    </span>
                    {isDerivedEntry(entry) && <AutoBadge />}
                  </span>
                  {entry.notes && (
                    <span className="mt-0.5 max-w-[280px] truncate text-caption text-text-secondary">
                      {entry.notes}
                    </span>
                  )}
                </div>
              </Td>

              {isIncome && (
                <Td>
                  {entry.clientId && clientName?.(entry.clientId) ? (
                    <span className="inline-flex items-center gap-1.5 text-body text-text-primary">
                      <Link2 size={14} className="text-sage-green" />
                      {clientName(entry.clientId)}
                    </span>
                  ) : (
                    <span className="text-body text-text-secondary">—</span>
                  )}
                </Td>
              )}

              {isInvestment && (
                <Td className="text-right tabular-nums">
                  {entry.cdiPercent != null ? `${entry.cdiPercent}%` : '—'}
                </Td>
              )}

              <Td>
                <div className="flex flex-wrap gap-1">
                  {boxName(entry) && <Badge tone="info">{boxName(entry)}</Badge>}
                  {entry.category ? (
                    <Badge tone="neutral">{entry.category}</Badge>
                  ) : (
                    !boxName(entry) && <span className="text-body text-text-secondary">—</span>
                  )}
                </div>
              </Td>

              <Td>
                <div className="flex flex-col">
                  <span className={overdue ? 'text-body-strong text-danger' : 'text-body text-text-primary'}>
                    {formatDate(next?.dueDate ?? entry.date)}
                  </span>
                  {isExpense &&
                    (overdue ? (
                      <span className="text-caption font-semibold text-danger">
                        {plan && next ? `Parcela ${next.number} atrasada` : 'Atrasada'}
                      </span>
                    ) : entry.paid ? (
                      <span className="text-caption text-text-secondary">
                        Paga{entry.paidAt ? ` em ${formatDate(entry.paidAt)}` : ''}
                      </span>
                    ) : plan && next ? (
                      <span className="text-caption text-text-secondary">
                        Parcela {next.number} de {next.total}
                      </span>
                    ) : (
                      <span className="text-caption text-text-secondary">A pagar</span>
                    ))}
                </div>
              </Td>

              {isExpense && (
                <Td>
                  <div className="flex max-w-[240px] flex-col gap-1">
                    <span className="text-caption text-text-secondary">
                      {describePayment(entry, formatCurrency)}
                    </span>
                    {plan && <InstallmentProgress entry={entry} />}
                  </div>
                </Td>
              )}

              <Td className="text-right">
                <div className="flex flex-col items-end">
                  <span className="text-body-strong tabular-nums text-text-primary">
                    {formatCurrency(next ? next.value : entry.amount)}
                  </span>
                  {plan && (
                    <span className="text-caption tabular-nums text-text-secondary">
                      total {formatCurrency(entry.amount)}
                    </span>
                  )}
                </div>
              </Td>

              <Td>
                <ActionsMenu items={buildActions(entry, handlers)} />
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}
