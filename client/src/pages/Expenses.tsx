import { FinanceLedgerPage, LedgerStat } from '@/components/finance/FinanceLedgerPage';
import { FinanceEntry } from '@/types';
import { pendingForMonth, summarizeBills, totalsForMonth } from '@/utils/finance';
import { formatCurrency } from '@/utils/formatters';

function stats(entries: FinanceEntry[]): LedgerStat[] {
  const bills = summarizeBills(entries);
  const pendingThisMonth = pendingForMonth(entries);

  return [
    {
      label: 'Falta pagar este mês',
      value: formatCurrency(pendingThisMonth),
      caption:
        bills.openCount === 0
          ? 'Nada pendente'
          : `${bills.openCount} conta${bills.openCount === 1 ? '' : 's'} em aberto${
              bills.dueSoonCount > 0 ? ` · ${bills.dueSoonCount} vence${bills.dueSoonCount === 1 ? '' : 'm'} em 7 dias` : ''
            }`,
    },
    {
      label: 'Atrasadas',
      value: formatCurrency(bills.overdueTotal),
      caption:
        bills.overdueCount === 0
          ? 'Nenhuma conta atrasada'
          : `${bills.overdueCount} conta${bills.overdueCount === 1 ? '' : 's'} com o prazo vencido`,
      attention: bills.overdueCount > 0,
    },
    {
      label: 'Gasto do mês',
      value: formatCurrency(totalsForMonth(entries).expense),
      caption: 'Pagas e a pagar, incluindo a parcela do mês do cartão',
    },
  ];
}

export default function Expenses() {
  return (
    <FinanceLedgerPage
      kind="expense"
      title="Despesas"
      subtitle="Tudo que precisa ser pago. No cartão, informe as parcelas e vá marcando cada uma conforme paga a fatura."
      stats={stats}
      emptyDescription="Registre o que precisa ser pago para não perder nenhum vencimento."
    />
  );
}
