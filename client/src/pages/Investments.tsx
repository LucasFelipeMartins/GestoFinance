import { useState } from 'react';
import { FinanceLedgerPage, LedgerStat } from '@/components/finance/FinanceLedgerPage';
import { InvestmentSimulator, SimulatorSeed } from '@/components/finance/InvestmentSimulator';
import { FinanceEntry } from '@/types';
import { estimateMonthlyYield, readStoredAnnualCdi, totalsForMonth } from '@/utils/finance';
import { formatCurrency } from '@/utils/formatters';

function stats(entries: FinanceEntry[]): LedgerStat[] {
  const annualCdi = readStoredAnnualCdi();
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

  return [
    {
      label: 'Total investido',
      value: formatCurrency(total),
      caption: `${entries.length} aplicaç${entries.length === 1 ? 'ão' : 'ões'}`,
    },
    {
      label: 'Investido este mês',
      value: formatCurrency(totalsForMonth(entries).investment),
      caption: 'Aplicações feitas no mês atual',
    },
    {
      label: 'Rende por mês (estimado)',
      value: formatCurrency(estimateMonthlyYield(entries, annualCdi)),
      caption: `Antes do imposto, com CDI a ${annualCdi.toLocaleString('pt-BR')}% ao ano`,
    },
  ];
}

export default function Investments() {
  // Set by "Simular rendimento" on a row, so the simulator opens already
  // filled with that application's value and percentual do CDI.
  const [seed, setSeed] = useState<SimulatorSeed | undefined>();
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  return (
    <FinanceLedgerPage
      kind="investment"
      title="Investimentos"
      subtitle="Onde seu dinheiro está aplicado e quanto ele rende. Use o simulador para ver quanto um valor renderia."
      stats={stats}
      emptyDescription="Registre suas aplicações para acompanhar o total investido e simular o rendimento."
      onSimulate={(entry) => {
        setSeed({
          amount: entry.amount,
          cdiPercent: entry.cdiPercent,
          description: entry.description,
        });
        setSimulatorOpen(true);
      }}
    >
      <InvestmentSimulator seed={seed} open={simulatorOpen} onOpenChange={setSimulatorOpen} />
    </FinanceLedgerPage>
  );
}
