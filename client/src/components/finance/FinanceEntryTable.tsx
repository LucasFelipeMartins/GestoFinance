import { Pencil, Trash2, Calculator, Link2, UserCheck, Sparkles } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { ActionsMenu, ActionsMenuItem } from '@/components/ui/ActionsMenu';
import { FinanceEntry, FinanceKind } from '@/types';
import { FINANCE_META } from '@/utils/financeMeta';
import { describePayment, isBillOverdue } from '@/utils/finance';
import { isDerivedEntry } from '@/repositories/financeRepository';
import { formatCurrency, formatDate } from '@/utils/formatters';

export interface FinanceEntryListProps {
  entries: FinanceEntry[];
  kind: FinanceKind;
  onEdit: (entry: FinanceEntry) => void;
  onDelete: (entry: FinanceEntry) => void;
  onTogglePaid?: (entry: FinanceEntry) => void;
  onSimulate?: (entry: FinanceEntry) => void;
  /** Opens the Client behind a derived receita — where it is actually edited. */
  onOpenClient?: (clientId: string) => void;
  /** Resolves a linked client's name for the Lucros view. */
  clientName?: (clientId: string) => string | undefined;
}

/** Marks a receita that came from concluding a client rather than a form. */
export function AutoBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-badge bg-finance-income-soft px-2 py-0.5 text-micro font-semibold text-[#2F6B34]"
      title="Gerado automaticamente ao concluir o cliente"
    >
      <Sparkles size={11} aria-hidden="true" />
      Automático
    </span>
  );
}

export function buildActions(
  entry: FinanceEntry,
  onEdit: (entry: FinanceEntry) => void,
  onDelete: (entry: FinanceEntry) => void,
  onSimulate?: (entry: FinanceEntry) => void,
  onOpenClient?: (clientId: string) => void
): ActionsMenuItem[] {
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

  const items: ActionsMenuItem[] = [
    { label: 'Editar', icon: <Pencil size={17} />, onSelect: () => onEdit(entry) },
  ];
  if (onSimulate && entry.kind === 'investment') {
    items.push({ label: 'Simular rendimento', icon: <Calculator size={17} />, onSelect: () => onSimulate(entry) });
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

export function FinanceEntryTable({
  entries,
  kind,
  onEdit,
  onDelete,
  onTogglePaid,
  onSimulate,
  onOpenClient,
  clientName,
}: FinanceEntryListProps) {
  const meta = FINANCE_META[kind];
  const isExpense = kind === 'expense';
  const isInvestment = kind === 'investment';
  const isIncome = kind === 'income';

  return (
    <Table>
      <Thead>
        <Tr>
          {isExpense && <Th className="w-14" aria-label="Pago" />}
          <Th>Descrição</Th>
          {isIncome && <Th>Cliente</Th>}
          {isInvestment && <Th className="text-right">% do CDI</Th>}
          <Th>Categoria</Th>
          <Th>{meta.dateLabel}</Th>
          {isExpense && <Th>Pagamento</Th>}
          <Th className="text-right">Valor</Th>
          <Th className="w-14" aria-label="Ações" />
        </Tr>
      </Thead>
      <Tbody>
        {entries.map((entry) => {
          const overdue = isBillOverdue(entry);
          return (
            <Tr key={entry.id}>
              {isExpense && (
                <Td>
                  <Checkbox
                    checked={entry.paid}
                    onCheckedChange={() => onTogglePaid?.(entry)}
                    label={`Marcar "${entry.description}" como paga`}
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
                {entry.category ? (
                  <Badge tone="neutral">{entry.category}</Badge>
                ) : (
                  <span className="text-body text-text-secondary">—</span>
                )}
              </Td>

              <Td>
                <div className="flex flex-col">
                  <span className={overdue ? 'text-body-strong text-danger' : 'text-body text-text-primary'}>
                    {formatDate(entry.date)}
                  </span>
                  {isExpense &&
                    (overdue ? (
                      <span className="text-caption font-semibold text-danger">Vencida</span>
                    ) : entry.paid ? (
                      <span className="text-caption text-text-secondary">
                        Paga{entry.paidAt ? ` em ${formatDate(entry.paidAt)}` : ''}
                      </span>
                    ) : (
                      <span className="text-caption text-text-secondary">Em aberto</span>
                    ))}
                </div>
              </Td>

              {isExpense && (
                <Td>
                  <span className="text-body text-text-secondary">
                    {describePayment(entry, formatCurrency)}
                  </span>
                </Td>
              )}

              <Td className="text-right">
                <span className="text-body-strong tabular-nums text-text-primary">
                  {formatCurrency(entry.amount)}
                </span>
              </Td>

              <Td>
                <ActionsMenu items={buildActions(entry, onEdit, onDelete, onSimulate, onOpenClient)} />
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}
