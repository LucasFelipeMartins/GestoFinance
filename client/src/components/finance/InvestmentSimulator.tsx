import { useEffect, useMemo, useState } from 'react';
import { Calculator, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  simulateYield,
  formatRate,
  readStoredAnnualCdi,
  storeAnnualCdi,
  BUSINESS_DAYS_PER_MONTH,
} from '@/utils/finance';
import { formatCurrency } from '@/utils/formatters';

const PERIOD_OPTIONS = [
  { value: '1', label: '1 mês' },
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
];

export interface SimulatorSeed {
  amount: number;
  cdiPercent?: number;
  description?: string;
}

interface InvestmentSimulatorProps {
  /** Prefill from an existing investimento ("Simular rendimento" na lista). */
  seed?: SimulatorSeed;
}

/**
 * "Quanto isso rende até o fim do mês?"
 *
 * The percentual do CDI applies to the daily rate over 252 business days a
 * year — the market convention, and the reason the numbers here line up with
 * a bank's own projection instead of running high.
 */
export function InvestmentSimulator({ seed }: InvestmentSimulatorProps) {
  const [principal, setPrincipal] = useState(seed?.amount ?? 1000);
  const [annualCdi, setAnnualCdi] = useState(() => readStoredAnnualCdi());
  const [cdiPercent, setCdiPercent] = useState(seed?.cdiPercent ?? 100);
  const [months, setMonths] = useState('1');
  const [taxExempt, setTaxExempt] = useState(false);

  // Re-seed when the user picks a different investimento from the list.
  useEffect(() => {
    if (!seed) return;
    setPrincipal(seed.amount);
    if (seed.cdiPercent != null) setCdiPercent(seed.cdiPercent);
  }, [seed]);

  // Shared with the Investimentos page, which uses the same rate for its
  // portfolio estimate — one number the user maintains in one place.
  useEffect(() => {
    storeAnnualCdi(annualCdi);
  }, [annualCdi]);

  const result = useMemo(
    () =>
      simulateYield({
        principal,
        annualCdiPercent: annualCdi,
        cdiPercent,
        months: Number(months),
        taxExempt,
      }),
    [principal, annualCdi, cdiPercent, months, taxExempt]
  );

  const periodLabel =
    result.months === 1 ? 'no primeiro mês' : `em ${result.months} meses`;

  return (
    <Card className="flex flex-col gap-6">
      <div>
        <h3 className="flex items-center gap-2 text-h3 text-text-primary">
          <Calculator size={19} className="text-finance-investment" />
          Simulador de rendimento
        </h3>
        <p className="mt-0.5 text-caption text-text-secondary">
          Quanto um valor rende a um percentual do CDI, com juros compostos sobre{' '}
          {BUSINESS_DAYS_PER_MONTH} dias úteis por mês.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CurrencyInput label="Valor aplicado" value={principal} onChange={setPrincipal} />

        <Input
          label="CDI anual (%)"
          type="number"
          inputMode="decimal"
          step="0.05"
          min="0"
          value={annualCdi}
          hint="A taxa CDI vigente, informada por você."
          onChange={(event) => setAnnualCdi(Number(event.target.value))}
        />

        <Input
          label="Rendimento da aplicação (% do CDI)"
          type="number"
          inputMode="decimal"
          step="1"
          min="0"
          value={cdiPercent}
          hint="Ex: 110 para um CDB que paga 110% do CDI."
          onChange={(event) => setCdiPercent(Number(event.target.value))}
        />

        <div className="flex flex-col justify-between gap-3">
          <SegmentedControl label="Período" options={PERIOD_OPTIONS} value={months} onChange={setMonths} />
          <Checkbox
            checked={taxExempt}
            onCheckedChange={setTaxExempt}
            label="Isento de IR (LCI, LCA, poupança)"
          />
        </div>
      </div>

      {/* The answer is one number — give it hero treatment instead of a chart. */}
      <div className="rounded-card border border-finance-investment/20 bg-finance-investment-soft/60 p-5">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
          Rendimento líquido {periodLabel}
        </p>
        <p className="mt-1 text-display tabular-nums text-text-primary">
          {formatCurrency(result.netYield)}
        </p>
        <p className="mt-1 text-body text-text-secondary">
          Saldo final de <strong className="text-text-primary">{formatCurrency(result.netBalance)}</strong> ·{' '}
          {formatRate(result.monthlyRate)} ao mês · {formatRate(result.effectiveAnnualRate)} ao ano
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
          <dt className="text-body text-text-secondary">Valor aplicado</dt>
          <dd className="text-body-strong tabular-nums text-text-primary">
            {formatCurrency(result.principal)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
          <dt className="text-body text-text-secondary">Rendimento bruto</dt>
          <dd className="text-body-strong tabular-nums text-text-primary">
            {formatCurrency(result.grossYield)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
          <dt className="text-body text-text-secondary">
            IR {result.taxRate > 0 ? `(${formatRate(result.taxRate, 1)})` : '(isento)'}
          </dt>
          <dd className="text-body-strong tabular-nums text-text-primary">
            {result.tax > 0 ? `− ${formatCurrency(result.tax)}` : formatCurrency(0)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
          <dt className="text-body text-text-secondary">Saldo final</dt>
          <dd className="text-body-strong tabular-nums text-text-primary">
            {formatCurrency(result.netBalance)}
          </dd>
        </div>
      </dl>

      {result.months > 1 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-left">
            <caption className="sr-only">Projeção mês a mês do saldo bruto</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-3 text-caption font-semibold text-text-secondary">
                  Mês
                </th>
                <th scope="col" className="py-2 pr-3 text-right text-caption font-semibold text-text-secondary">
                  Rendimento acumulado
                </th>
                <th scope="col" className="py-2 text-right text-caption font-semibold text-text-secondary">
                  Saldo bruto
                </th>
              </tr>
            </thead>
            <tbody>
              {result.breakdown.map((row) => (
                <tr key={row.month} className="border-b border-border/60 last:border-0">
                  <th scope="row" className="py-2 pr-3 text-body font-normal text-text-primary">
                    {row.month}º
                  </th>
                  <td className="py-2 pr-3 text-right text-body tabular-nums text-text-primary">
                    {formatCurrency(row.grossYield)}
                  </td>
                  <td className="py-2 text-right text-body tabular-nums text-text-primary">
                    {formatCurrency(row.grossBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex items-start gap-2 text-caption text-text-secondary">
        <Info size={14} className="mt-0.5 shrink-0" />
        Projeção estimada: assume o CDI constante no período e não considera IOF em resgates com menos
        de 30 dias nem taxas da corretora.
      </p>
    </Card>
  );
}
