import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, Info, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
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
  { value: '12', label: '1 ano' },
];

export interface SimulatorSeed {
  amount: number;
  cdiPercent?: number;
  description?: string;
}

interface InvestmentSimulatorProps {
  /** Prefill from an existing investimento ("Simular rendimento" na lista). */
  seed?: SimulatorSeed;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Quanto isso rende até o fim do mês?"
 *
 * Collapsed by default so the Investimentos page stays about the list; the
 * "Simular rendimento" button (or the row action) opens it. The percentual do
 * CDI applies to the daily rate over 252 business days a year — the market
 * convention, and the reason the numbers here line up with a bank's own
 * projection instead of running high.
 */
export function InvestmentSimulator({ seed, open, onOpenChange }: InvestmentSimulatorProps) {
  const [principal, setPrincipal] = useState(seed?.amount ?? 1000);
  const [annualCdi, setAnnualCdi] = useState(() => readStoredAnnualCdi());
  const [cdiPercent, setCdiPercent] = useState(seed?.cdiPercent ?? 100);
  const [months, setMonths] = useState('1');
  const [taxExempt, setTaxExempt] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Re-seed when the user picks a different investimento from the list.
  useEffect(() => {
    if (!seed) return;
    setPrincipal(seed.amount);
    if (seed.cdiPercent != null) setCdiPercent(seed.cdiPercent);
  }, [seed]);

  // Bring the panel into view when it opens from a row further down the page.
  useEffect(() => {
    if (open) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [open, seed]);

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

  const periodLabel = result.months === 1 ? 'no primeiro mês' : result.months === 12 ? 'em 1 ano' : `em ${result.months} meses`;

  if (!open) {
    return (
      <Card padding="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-finance-investment-soft text-finance-investment">
            <Calculator size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-body-strong text-text-primary">Quer saber quanto um valor rende?</p>
            <p className="text-caption text-text-secondary">
              Informe o valor, o % do CDI e o prazo e veja o rendimento líquido.
            </p>
          </div>
        </div>
        <Button variant="secondary" leftIcon={<Calculator size={17} />} onClick={() => onOpenChange(true)}>
          Simular rendimento
        </Button>
      </Card>
    );
  }

  return (
    <div ref={panelRef} className="animate-fade-up">
      <Card className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-h3 text-text-primary">
              <Calculator size={19} className="text-finance-investment" />
              Simular rendimento
              {seed?.description && (
                <span className="truncate text-body font-normal text-text-secondary">· {seed.description}</span>
              )}
            </h3>
            <p className="mt-0.5 text-caption text-text-secondary">
              Cálculo com juros compostos sobre {BUSINESS_DAYS_PER_MONTH} dias úteis por mês, como os bancos fazem.
            </p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<X size={16} />} onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CurrencyInput label="Valor aplicado" value={principal} onChange={setPrincipal} />

          <Input
            label="Taxa CDI do ano (%)"
            type="number"
            inputMode="decimal"
            step="0.05"
            min="0"
            value={annualCdi}
            hint="A taxa CDI atual. Pesquise “CDI hoje” para conferir."
            onChange={(event) => setAnnualCdi(Number(event.target.value))}
          />

          <Input
            label="Quanto a aplicação rende (% do CDI)"
            type="number"
            inputMode="decimal"
            step="1"
            min="0"
            value={cdiPercent}
            hint="Ex.: 110 para um CDB que paga 110% do CDI."
            onChange={(event) => setCdiPercent(Number(event.target.value))}
          />

          <div className="flex flex-col gap-3">
            <SegmentedControl label="Por quanto tempo?" options={PERIOD_OPTIONS} value={months} onChange={setMonths} />
            <div className="-mt-1 flex h-9 items-center">
              <Checkbox
                checked={taxExempt}
                onCheckedChange={setTaxExempt}
                label="Sem imposto de renda (LCI, LCA, poupança)"
              />
            </div>
          </div>
        </div>

        {/* The answer is one number — give it hero treatment instead of a chart. */}
        <div className="rounded-card border border-finance-investment/20 bg-finance-investment-soft/60 p-5">
          <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
            Rende, já descontado o imposto, {periodLabel}
          </p>
          <p className="mt-1 text-display tabular-nums text-text-primary">{formatCurrency(result.netYield)}</p>
          <p className="mt-1 text-body text-text-secondary">
            Você termina com <strong className="text-text-primary">{formatCurrency(result.netBalance)}</strong> ·{' '}
            {formatRate(result.monthlyRate)} ao mês · {formatRate(result.effectiveAnnualRate)} ao ano
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
            <dt className="text-body text-text-secondary">Valor aplicado</dt>
            <dd className="text-body-strong tabular-nums text-text-primary">{formatCurrency(result.principal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
            <dt className="text-body text-text-secondary">Rendimento antes do imposto</dt>
            <dd className="text-body-strong tabular-nums text-text-primary">{formatCurrency(result.grossYield)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
            <dt className="text-body text-text-secondary">
              Imposto de renda {result.taxRate > 0 ? `(${formatRate(result.taxRate, 1)})` : '(isento)'}
            </dt>
            <dd className="text-body-strong tabular-nums text-text-primary">
              {result.tax > 0 ? `− ${formatCurrency(result.tax)}` : formatCurrency(0)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
            <dt className="text-body text-text-secondary">Valor final</dt>
            <dd className="text-body-strong tabular-nums text-text-primary">{formatCurrency(result.netBalance)}</dd>
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
                    Saldo (antes do imposto)
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
          É uma estimativa: considera o CDI parado no valor informado e não inclui IOF em resgates com
          menos de 30 dias nem taxas da corretora.
        </p>
      </Card>
    </div>
  );
}
