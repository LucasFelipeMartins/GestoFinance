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
      caption: 'Tudo que entrou no mês atual',
    },
    {
      label: 'De clientes concluídos',
      value: formatCurrency(sum(fromClients)),
      caption: `${fromClients.length} cliente${fromClients.length === 1 ? '' : 's'} · entra sozinho`,
    },
    {
      label: 'Outras entradas',
      value: formatCurrency(sum(manual)),
      caption: `${manual.length} registro${manual.length === 1 ? '' : 's'} · vendas, salários, outros`,
    },
  ];
}

export default function Income() {
  return (
    <FinanceLedgerPage
      kind="income"
      title="Receitas"
      subtitle="Todo dinheiro que entra. Clientes concluídos aparecem aqui sozinhos; o resto — vendas, salário, outras entradas — você registra à mão."
      stats={stats}
      emptyDescription="Conclua um cliente ou registre uma entrada para começar a acompanhar suas receitas."
    />
  );
}
