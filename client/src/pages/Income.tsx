import { FinanceLedgerPage, LedgerStat } from '@/components/finance/FinanceLedgerPage';
import { FinanceEntry } from '@/types';
import { totalsForMonth } from '@/utils/finance';
import { formatCurrency } from '@/utils/formatters';

function sum(entries: FinanceEntry[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

function stats(entries: FinanceEntry[]): LedgerStat[] {
  // Two sources, reported separately so it is always clear where the money
  // came from: clients concluded, and everything typed in by hand.
  const fromClients = entries.filter((entry) => entry.source === 'client');
  const manual = entries.filter((entry) => entry.source !== 'client');

  return [
    {
      label: 'Recebido este mês',
      value: formatCurrency(totalsForMonth(entries).income),
    },
    {
      label: 'De clientes concluídos',
      value: formatCurrency(sum(fromClients)),
      caption: `${fromClients.length} cliente${fromClients.length === 1 ? '' : 's'} · automático`,
    },
    {
      label: 'Lançado manualmente',
      value: formatCurrency(sum(manual)),
      caption: `${manual.length} lançamento${manual.length === 1 ? '' : 's'} · vendas, salários, outros`,
    },
  ];
}

export default function Income() {
  return (
    <FinanceLedgerPage
      kind="income"
      title="Lucros"
      subtitle="Clientes concluídos entram aqui sozinhos. Lance à mão o que vem de fora — vendas, salários e outras entradas."
      stats={stats}
      emptyDescription="Conclua um cliente ou lance uma entrada manual para começar a acompanhar seus lucros."
    />
  );
}
