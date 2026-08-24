import { FinanceLedgerPage, LedgerStat } from '@/components/finance/FinanceLedgerPage';
import { FinanceEntry } from '@/types';
import { summarizeBills, totalsForMonth } from '@/utils/finance';
import { formatCurrency } from '@/utils/formatters';

function stats(entries: FinanceEntry[]): LedgerStat[] {
  const bills = summarizeBills(entries);

  return [
    {
      label: 'Em aberto',
      value: formatCurrency(bills.openTotal),
      caption:
        bills.openCount === 0
          ? 'Nada pendente'
          : `${bills.openCount} conta${bills.openCount === 1 ? '' : 's'}${
              bills.dueSoonCount > 0 ? ` · ${bills.dueSoonCount} vence(m) em 7 dias` : ''
            }`,
    },
    {
      label: 'Vencidas',
      value: formatCurrency(bills.overdueTotal),
      caption:
        bills.overdueCount === 0
          ? 'Nenhuma conta atrasada'
          : `${bills.overdueCount} conta${bills.overdueCount === 1 ? '' : 's'} atrasada${
              bills.overdueCount === 1 ? '' : 's'
            }`,
      attention: bills.overdueCount > 0,
    },
    {
      label: 'Comprometido no mês',
      value: formatCurrency(totalsForMonth(entries).expense),
      caption: 'Inclui a parcela do mês das compras no cartão',
    },
  ];
}

export default function Expenses() {
  return (
    <FinanceLedgerPage
      kind="expense"
      title="Despesas"
      subtitle="Tudo que precisa ser pago. Marque como paga, informe pix ou cartão e, no cartão, as parcelas."
      stats={stats}
      emptyDescription="Cadastre o que precisa ser pago para não perder nenhum vencimento."
    />
  );
}
