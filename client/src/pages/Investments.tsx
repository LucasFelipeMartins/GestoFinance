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
      label: 'Aplicado este mês',
      value: formatCurrency(totalsForMonth(entries).investment),
    },
    {
      label: 'Rendimento estimado / mês',
      value: formatCurrency(estimateMonthlyYield(entries, annualCdi)),
      caption: `Bruto, com CDI a ${annualCdi.toLocaleString('pt-BR')}% ao ano`,
    },
  ];
}

export default function Investments() {
  // Set by "Simular rendimento" on a row, so the simulator opens already
  // filled with that application's value and percentual do CDI.
  const [seed, setSeed] = useState<SimulatorSeed | undefined>();

  return (
    <FinanceLedgerPage
      kind="investment"
      title="Investimentos"
      subtitle="Onde o dinheiro está aplicado e quanto ele rende a um determinado percentual do CDI."
      stats={stats}
      emptyDescription="Cadastre suas aplicações para acompanhar o total investido e simular o rendimento."
      onSimulate={(entry) =>
        setSeed({
          amount: entry.amount,
          cdiPercent: entry.cdiPercent,
          description: entry.description,
        })
      }
    >
      <InvestmentSimulator seed={seed} />
    </FinanceLedgerPage>
  );
}
