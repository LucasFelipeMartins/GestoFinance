import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Table2 } from 'lucide-react';
import { FinanceKind } from '@/types';
import { MonthBucket } from '@/utils/finance';
import { FINANCE_META, FINANCE_KIND_ORDER } from '@/utils/financeMeta';
import { formatCompactCurrency, formatCurrency } from '@/utils/formatters';
import { SeriesMark, SeriesMarkKey } from './SeriesMark';

const SURFACE = '#FFFFFF';
const GRID = '#EAF0E6';
const AXIS_TEXT = '#66705F';
/** Connects a nudged endpoint label back to its marker — a step darker than
 * the grid so it reads as a connector rather than another gridline. */
const LEADER = '#C4D2BE';

const CHART_HEIGHT = 288;
/**
 * Below this the endpoint labels are dropped — the panel above the chart
 * already reports the current month, so nothing becomes unreachable.
 * Tuned to the narrowest real case that still fits them: the chart column on
 * Home at the xl breakpoint measures ~530px inside its card.
 */
const ENDPOINT_LABEL_MIN_WIDTH = 470;

/**
 * Rounds a value up to the next clean step. The ladder is deliberately
 * fine-grained: a coarse 1/2/5 ladder would round a R$ 2.950 step up to
 * R$ 5.000 and leave the top 40% of the plot empty.
 */
const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const nice = NICE_STEPS.find((step) => normalized <= step) ?? 10;
  return nice * magnitude;
}

function useMeasuredWidth<T extends HTMLElement>(initialWidth = 0) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initialWidth);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    setWidth(node.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

const VISIBILITY_STORAGE_KEY = 'gestorpro:finance-chart-series';

function readStoredVisibility(): Record<FinanceKind, boolean> {
  const fallback = { income: true, expense: true, investment: true };
  try {
    const raw = localStorage.getItem(VISIBILITY_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Record<FinanceKind, boolean>>;
    return {
      income: parsed.income ?? true,
      expense: parsed.expense ?? true,
      investment: parsed.investment ?? true,
    };
  } catch {
    return fallback;
  }
}

interface FinanceChartProps {
  series: MonthBucket[];
  /**
   * Width to draw at before the ResizeObserver reports in. Left at 0 in the
   * app (the observer fires on mount, so nothing flashes at the wrong size);
   * set only by static renders, which have no observer to wait for.
   */
  initialWidth?: number;
}

/**
 * Lucros, gastos e investimentos over the last months, one line each.
 *
 * One y-axis for all three (they are all BRL, so they genuinely share a
 * scale). Each line can be switched off from the legend, and the choice is
 * remembered per device.
 */
export function FinanceChart({ series, initialWidth = 0 }: FinanceChartProps) {
  const [wrapperRef, width] = useMeasuredWidth<HTMLDivElement>(initialWidth);
  const [visible, setVisible] = useState<Record<FinanceKind, boolean>>(() => readStoredVisibility());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(visible));
    } catch {
      // A private window with storage blocked just loses the preference.
    }
  }, [visible]);

  const toggle = useCallback((kind: FinanceKind) => {
    setVisible((current) => ({ ...current, [kind]: !current[kind] }));
  }, []);

  const activeKinds = FINANCE_KIND_ORDER.filter((kind) => visible[kind]);
  const showEndpointLabels = width >= ENDPOINT_LABEL_MIN_WIDTH;

  const padding = {
    top: 22,
    right: showEndpointLabels ? 84 : 14,
    bottom: 30,
    left: 58,
  };

  const innerWidth = Math.max(0, width - padding.left - padding.right);
  const innerHeight = CHART_HEIGHT - padding.top - padding.bottom;

  const rawMax = Math.max(
    0,
    ...series.flatMap((bucket) => activeKinds.map((kind) => bucket[kind]))
  );
  const tickCount = 4;
  // An all-zero ledger still deserves a readable axis rather than a flat line
  // pinned to an invisible scale.
  const step = rawMax > 0 ? niceCeil(rawMax / tickCount) : 250;
  const maxValue = step * tickCount;

  const xFor = (index: number) =>
    padding.left + (series.length <= 1 ? innerWidth / 2 : (index * innerWidth) / (series.length - 1));
  const yFor = (value: number) => padding.top + innerHeight - (value / maxValue) * innerHeight;

  const hasData = series.some((bucket) => bucket.income || bucket.expense || bucket.investment);

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (innerWidth <= 0 || series.length === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - padding.left;
    const ratio = series.length <= 1 ? 0 : x / innerWidth;
    const index = Math.round(ratio * (series.length - 1));
    setActiveIndex(Math.max(0, Math.min(series.length - 1, index)));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setActiveIndex((current) => {
      const base = current ?? series.length - 1;
      const next = event.key === 'ArrowLeft' ? base - 1 : base + 1;
      return Math.max(0, Math.min(series.length - 1, next));
    });
  };

  // Endpoint labels for the last month, de-collided top-to-bottom with a
  // leader line back to each marker so a nudged label still reads as its own.
  const endpointLabels = (() => {
    if (!showEndpointLabels || series.length === 0) return [];
    const last = series[series.length - 1]!;
    const placed = activeKinds
      .map((kind) => ({ kind, value: last[kind], y: yFor(last[kind]) }))
      .sort((a, b) => a.y - b.y);

    const MIN_GAP = 16;
    placed.forEach((label, i) => {
      const previous = placed[i - 1];
      if (previous && label.y - previous.y < MIN_GAP) {
        label.y = previous.y + MIN_GAP;
      }
    });
    return placed;
  })();

  const activeBucket = activeIndex !== null ? series[activeIndex] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-h3 text-text-primary">Evolução financeira</h3>
          <p className="mt-0.5 text-caption text-text-secondary">
            Últimos {series.length} meses · compras parceladas contam mês a mês
          </p>
        </div>

        {/* The legend doubles as the on/off control for each line. */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Séries do gráfico">
          {FINANCE_KIND_ORDER.map((kind) => {
            const meta = FINANCE_META[kind];
            const isOn = visible[kind];
            return (
              <button
                key={kind}
                type="button"
                onClick={() => toggle(kind)}
                aria-pressed={isOn}
                className={`inline-flex items-center gap-2 rounded-badge border px-3 py-1.5 text-caption font-semibold
                  transition-all duration-200 ease-gentle
                  ${
                    isOn
                      ? 'border-transparent text-text-primary'
                      : 'border-border bg-white text-text-secondary opacity-60 hover:opacity-100'
                  }`}
                style={isOn ? { backgroundColor: meta.soft } : undefined}
              >
                <SeriesMarkKey shape={meta.shape} color={isOn ? meta.color : '#9AA396'} withLine />
                {meta.plural}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={wrapperRef}
        className="relative w-full"
        tabIndex={0}
        role="application"
        aria-label={`Gráfico de linhas com lucros, gastos e investimentos dos últimos ${series.length} meses. Use as setas para percorrer os meses.`}
        onKeyDown={handleKeyDown}
        onBlur={() => setActiveIndex(null)}
      >
        {width > 0 && (
          <svg
            width={width}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
            className="touch-pan-y"
            onPointerMove={handlePointer}
            onPointerLeave={() => setActiveIndex(null)}
          >
            {/* Gridlines: solid hairlines, one shade off the surface. */}
            {Array.from({ length: tickCount + 1 }, (_, i) => {
              const value = step * i;
              const y = yFor(value);
              return (
                <g key={value}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + innerWidth}
                    y2={y}
                    stroke={GRID}
                    strokeWidth={1}
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={11}
                    fill={AXIS_TEXT}
                  >
                    {value === 0 ? 'R$ 0' : formatCompactCurrency(value)}
                  </text>
                </g>
              );
            })}

            {/* Month labels */}
            {series.map((bucket, index) => (
              <text
                key={bucket.key}
                x={xFor(index)}
                y={CHART_HEIGHT - 10}
                textAnchor="middle"
                fontSize={11}
                fontWeight={activeIndex === index ? 700 : 500}
                fill={AXIS_TEXT}
              >
                {bucket.label.charAt(0).toUpperCase() + bucket.label.slice(1)}
              </text>
            ))}

            {/* Crosshair — readers aim at a month, never at a 2px line. */}
            {activeIndex !== null && (
              <line
                x1={xFor(activeIndex)}
                y1={padding.top - 6}
                x2={xFor(activeIndex)}
                y2={padding.top + innerHeight}
                stroke="#C4D2BE"
                strokeWidth={1}
              />
            )}

            {FINANCE_KIND_ORDER.filter((kind) => visible[kind]).map((kind) => {
              const meta = FINANCE_META[kind];
              const path = series
                .map((bucket, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(bucket[kind])}`)
                .join(' ');

              return (
                <g key={kind}>
                  <path
                    d={path}
                    fill="none"
                    stroke={meta.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {series.map((bucket, index) => (
                    <SeriesMark
                      key={bucket.key}
                      shape={meta.shape}
                      color={meta.color}
                      cx={xFor(index)}
                      cy={yFor(bucket[kind])}
                      size={activeIndex === index ? 6 : 4.5}
                      surface={SURFACE}
                    />
                  ))}
                </g>
              );
            })}

            {/* Direct labels on the newest point, per series. */}
            {endpointLabels.map((label) => {
              const meta = FINANCE_META[label.kind];
              const markerX = xFor(series.length - 1);
              const markerY = yFor(label.value);
              return (
                <g key={`label-${label.kind}`}>
                  {Math.abs(label.y - markerY) > 2 && (
                    <line
                      x1={markerX + 7}
                      y1={markerY}
                      x2={padding.left + innerWidth + 8}
                      y2={label.y}
                      stroke={LEADER}
                      strokeWidth={1}
                    />
                  )}
                  <text
                    x={padding.left + innerWidth + 12}
                    y={label.y + 4}
                    fontSize={11}
                    fontWeight={600}
                    fill={AXIS_TEXT}
                  >
                    {formatCompactCurrency(label.value)}
                  </text>
                </g>
              );
            })}

            {/* Baseline last, so it sits above the gridlines. */}
            <line
              x1={padding.left}
              y1={padding.top + innerHeight}
              x2={padding.left + innerWidth}
              y2={padding.top + innerHeight}
              stroke="#D6E2D1"
              strokeWidth={1}
            />
          </svg>
        )}

        {!hasData && width > 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-body text-text-secondary">
            Nenhum lançamento nos últimos {series.length} meses.
          </p>
        )}

        {activeBucket && (
          <div
            className="pointer-events-none absolute z-10 min-w-[172px] rounded-input border border-border bg-white p-3 shadow-elevated"
            style={{
              left: Math.min(Math.max(xFor(activeIndex!) - 86, 4), Math.max(4, width - 180)),
              top: 4,
            }}
            role="status"
          >
            <p className="mb-2 text-caption font-semibold text-text-secondary">{activeBucket.fullLabel}</p>
            <ul className="flex flex-col gap-1.5">
              {activeKinds.map((kind) => {
                const meta = FINANCE_META[kind];
                return (
                  <li key={kind} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-caption text-text-secondary">
                      <SeriesMarkKey shape={meta.shape} color={meta.color} withLine />
                      {meta.plural}
                    </span>
                    <span className="text-body-strong text-text-primary">
                      {formatCurrency(activeBucket[kind])}
                    </span>
                  </li>
                );
              })}
              {activeKinds.length === 0 && (
                <li className="text-caption text-text-secondary">Nenhuma linha ativa.</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowTable((open) => !open)}
          aria-expanded={showTable}
          className="inline-flex items-center gap-1.5 text-caption font-semibold text-sage-green hover:underline"
        >
          <Table2 size={14} />
          {showTable ? 'Ocultar tabela' : 'Ver como tabela'}
        </button>

        {showTable && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 pr-3 text-caption font-semibold text-text-secondary">
                    Mês
                  </th>
                  {FINANCE_KIND_ORDER.map((kind) => (
                    <th
                      key={kind}
                      scope="col"
                      className="py-2 pr-3 text-right text-caption font-semibold text-text-secondary"
                    >
                      {FINANCE_META[kind].plural}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {series.map((bucket) => (
                  <tr key={bucket.key} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="py-2 pr-3 text-body text-text-primary">
                      {bucket.fullLabel}
                    </th>
                    {FINANCE_KIND_ORDER.map((kind) => (
                      <td key={kind} className="py-2 pr-3 text-right text-body tabular-nums text-text-primary">
                        {formatCurrency(bucket[kind])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
