import { useState } from 'react';
import { FinanceLedgerPage, LedgerStat } from '@/components/finance/FinanceLedgerPage';
import { InvestmentSimulator, SimulatorSeed } from '@/components/finance/InvestmentSimulator';
import { BoxesPanel } from '@/components/investments/BoxesPanel';
import { useFinanceEntries } from '@/hooks/useFinance';
import { FinanceEntry } from '@/types';
import { estimateMonthlyYield, readStoredAnnualCdi, totalsForMonth } from '@/utils/finance';
import { formatCurrency } from '@/utils/formatters';

function stats(entries: FinanceEntry[]): LedgerStat[] {
  const annualCdi = readStoredAnnualCdi();
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const deposits = entries.filter((entry) => entry.amount >= 0).length;

  return [
    {
      label: 'Total investido',
      value: formatCurrency(total),
      caption: `${deposits} aplicaç${deposits === 1 ? 'ão' : 'ões'} · cofrinhos incluídos`,
    },
    {
      label: 'Investido este mês',
      value: formatCurrency(totalsForMonth(entries).investment),
      caption: 'Aplicações menos resgates no mês atual',
    },
    {
      label: 'Rende por mês (estimado)',
      value: formatCurrency(estimateMonthlyYield(entries, annualCdi)),
      caption: `Antes do imposto, com CDI a ${annualCdi.toLocaleString('pt-BR')}% ao ano`,
    },
  ];
}

/**
 * Investimentos: the cofrinhos up top (each with its own balance, rate and
 * simulation), the full ledger of applications below. Home is untouched —
 * a pot's money is ordinary investment entries, so the total there already
 * includes it.
 */
export default function Investments() {
  // Set by "Simular rendimento" on a row or a cofrinho, so the simulator
  // opens already filled with that value and percentual do CDI.
  const [seed, setSeed] = useState<SimulatorSeed | undefined>();
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const { data: investments } = useFinanceEntries({ kind: 'investment' });
  const totalInvested = (investments ?? []).reduce((sum, entry) => sum + entry.amount, 0);

  const simulate = (next: SimulatorSeed) => {
    setSeed(next);
    setSimulatorOpen(true);
  };

  return (
    <FinanceLedgerPage
      kind="investment"
      title="Investimentos"
      subtitle="Cofrinhos por objetivo, todas as aplicações e quanto cada uma rende. Use o simulador para ver o futuro de cada valor."
      stats={stats}
      emptyDescription="Registre suas aplicações ou guarde dinheiro num cofrinho para acompanhar o total investido e simular o rendimento."
      onSimulate={(entry) =>
        simulate({ amount: entry.amount, cdiPercent: entry.cdiPercent, description: entry.description })
      }
    >
      <BoxesPanel totalInvested={totalInvested} onSimulate={simulate} />
      <InvestmentSimulator seed={seed} open={simulatorOpen} onOpenChange={setSimulatorOpen} />
    </FinanceLedgerPage>
  );
}
