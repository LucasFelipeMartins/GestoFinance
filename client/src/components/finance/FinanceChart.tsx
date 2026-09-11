import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Table2 } from 'lucide-react';
import { FinanceKind } from '@/types';
import { MonthBucket } from '@/utils/finance';
import { FINANCE_META, FINANCE_KIND_ORDER } from '@/utils/financeMeta';
import { formatCompactCurrency, formatCurrency } from '@/utils/formatters';
import { SeriesMark, SeriesMarkKey } from './SeriesMark';

const CHART_HEIGHT = 288;
/**
 * Below this the endpoint labels are dropped — the panel above the chart
 * already reports the current month, so nothing becomes unreachable.
 * Tuned to the narrowest real case that still fits them: the chart column on
 * Home at the xl breakpoint measures ~530px inside its card.
 */
const ENDPOINT_LABEL_MIN_WIDTH = 470;
/** How long the left-to-right reveal takes; marker pops are spread over it. */
const REVEAL_MS = 1100;

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

interface Point {
  x: number;
  y: number;
}

function sign(value: number): number {
  return value < 0 ? -1 : 1;
}

/** Tangent at the middle of three points (Fritsch–Carlson, as in d3's
 * curveMonotoneX): never overshoots, so a curve through zeros stays at zero
 * instead of dipping below the axis to look "smooth". */
function slope3(p0: Point, p1: Point, p2: Point): number {
  const h0 = p1.x - p0.x;
  const h1 = p2.x - p1.x;
  const s0 = (p1.y - p0.y) / (h0 || (h1 < 0 ? -0 : 0));
  const s1 = (p2.y - p1.y) / (h1 || (h0 < 0 ? -0 : 0));
  const p = (s0 * h1 + s1 * h0) / (h0 + h1);
  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
}

/** Tangent at an endpoint, given the neighbour's tangent. */
function slope2(p0: Point, p1: Point, t: number): number {
  const h = p1.x - p0.x;
  return h ? ((3 * (p1.y - p0.y)) / h - t) / 2 : t;
}

function bezier(p0: Point, p1: Point, t0: number, t1: number): string {
  const dx = (p1.x - p0.x) / 3;
  return ` C${p0.x + dx},${p0.y + dx * t0} ${p1.x - dx},${p1.y - dx * t1} ${p1.x},${p1.y}`;
}

/** A rounded line through every point that still respects the data. */
function monotonePath(points: Point[]): string {
  if (points.length === 0) return '';
  const first = points[0]!;
  let d = `M${first.x},${first.y}`;
  if (points.length === 1) return d;
  if (points.length === 2) return `${d} L${points[1]!.x},${points[1]!.y}`;

  const n = points.length;
  const tangents: number[] = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i += 1) {
    tangents[i] = slope3(points[i - 1]!, points[i]!, points[i + 1]!);
  }
  tangents[0] = slope2(points[0]!, points[1]!, tangents[1]!);
  tangents[n - 1] = slope2(points[n - 2]!, points[n - 1]!, tangents[n - 2]!);

  for (let i = 0; i < n - 1; i += 1) {
    d += bezier(points[i]!, points[i + 1]!, tangents[i]!, tangents[i + 1]!);
  }
  return d;
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
 * Receitas, despesas e investimentos over the last months, one line each.
 *
 * One y-axis for all three (they are all BRL, so they genuinely share a
 * scale). Each line can be switched off from the legend, and the choice is
 * remembered per device. Lines draw themselves in from the left when the
 * data changes; the motion is skipped for reduced-motion users (index.css).
 */
export function FinanceChart({ series, initialWidth = 0 }: FinanceChartProps) {
  const [wrapperRef, width] = useMeasuredWidth<HTMLDivElement>(initialWidth);
  const [visible, setVisible] = useState<Record<FinanceKind, boolean>>(() => readStoredVisibility());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const idPrefix = useId().replace(/:/g, '');

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
  const baselineY = padding.top + innerHeight;

  const rawMax = Math.max(0, ...series.flatMap((bucket) => activeKinds.map((kind) => bucket[kind])));
  const tickCount = 4;
  // An all-zero ledger still deserves a readable axis rather than a flat line
  // pinned to an invisible scale.
  const step = rawMax > 0 ? niceCeil(rawMax / tickCount) : 250;
  const maxValue = step * tickCount;

  const xFor = (index: number) =>
    padding.left + (series.length <= 1 ? innerWidth / 2 : (index * innerWidth) / (series.length - 1));
  const yFor = (value: number) => padding.top + innerHeight - (value / maxValue) * innerHeight;

  const hasData = series.some((bucket) => bucket.income || bucket.expense || bucket.investment);

  // Replays the draw-in when the numbers change (a new registro, a pull from
  // sync), but not on hover or resize — those just move things.
  const dataSignature = series.map((b) => `${b.key}:${b.income}:${b.expense}:${b.investment}`).join('|');

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
    // Pushing down can run past the baseline into the month labels (three
    // zeros stack there); walk back up so the stack ends at the baseline.
    for (let i = placed.length - 1; i >= 0; i -= 1) {
      const label = placed[i]!;
      const next = placed[i + 1];
      const ceiling = next ? next.y - MIN_GAP : baselineY;
      if (label.y > ceiling) label.y = ceiling;
    }
    return placed;
  })();

  const activeBucket = activeIndex !== null ? series[activeIndex] : undefined;
  const markDelay = (index: number) =>
    series.length <= 1 ? 0 : Math.round((index / (series.length - 1)) * REVEAL_MS * 0.85);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-h3 text-text-primary">Receitas, despesas e investimentos por mês</h3>
          <p className="mt-0.5 text-caption text-text-secondary">
            Últimos {series.length} meses · compras parceladas entram mês a mês
          </p>
        </div>

        {/* The legend doubles as the on/off control for each line. */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Linhas do gráfico">
          {FINANCE_KIND_ORDER.map((kind) => {
            const meta = FINANCE_META[kind];
            const isOn = visible[kind];
            return (
              <button
                key={kind}
                type="button"
                onClick={() => toggle(kind)}
                aria-pressed={isOn}
                title={isOn ? `Ocultar ${meta.plural.toLowerCase()}` : `Mostrar ${meta.plural.toLowerCase()}`}
                className={`inline-flex h-8 items-center gap-2 rounded-badge border px-3 text-caption font-semibold
                  transition-all duration-200 ease-gentle
                  ${
                    isOn
                      ? 'border-transparent text-text-primary'
                      : 'border-border bg-surface text-text-secondary opacity-60 hover:opacity-100'
                  }`}
                style={isOn ? { backgroundColor: meta.soft } : undefined}
              >
                <SeriesMarkKey shape={meta.shape} color={isOn ? meta.color : 'rgb(var(--c-text-secondary))'} withLine />
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
        aria-label={`Gráfico de linhas com receitas, despesas e investimentos dos últimos ${series.length} meses. Use as setas para percorrer os meses.`}
        onKeyDown={handleKeyDown}
        onBlur={() => setActiveIndex(null)}
      >
        {width > 0 && (
          <svg
            width={width}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
            className="touch-pan-y overflow-visible"
            onPointerMove={handlePointer}
            onPointerLeave={() => setActiveIndex(null)}
          >
            <defs>
              {FINANCE_KIND_ORDER.map((kind) => (
                <linearGradient key={kind} id={`${idPrefix}-area-${kind}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: FINANCE_META[kind].color, stopOpacity: 0.22 }} />
                  <stop offset="100%" style={{ stopColor: FINANCE_META[kind].color, stopOpacity: 0 }} />
                </linearGradient>
              ))}
              {/* One reveal clip per series, keyed with the data so it replays. */}
              {activeKinds.map((kind) => (
                <clipPath key={`${kind}-${dataSignature}`} id={`${idPrefix}-clip-${kind}`}>
                  <rect
                    x={padding.left - 8}
                    y={0}
                    width={innerWidth + 16}
                    height={CHART_HEIGHT}
                    className="animate-chart-reveal"
                    style={{ transformOrigin: `${padding.left - 8}px 0px` }}
                  />
                </clipPath>
              ))}
            </defs>

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
                    className="stroke-chart-grid"
                    strokeWidth={1}
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={11}
                    className="fill-text-secondary"
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
                className={activeIndex === index ? 'fill-text-primary' : 'fill-text-secondary'}
              >
                {bucket.label.charAt(0).toUpperCase() + bucket.label.slice(1)}
              </text>
            ))}

            {/* Crosshair — readers aim at a month, never at a 2px line. It
                slides between months instead of jumping. */}
            <line
              x1={0}
              y1={padding.top - 6}
              x2={0}
              y2={baselineY}
              className="stroke-chart-leader"
              strokeWidth={1}
              strokeDasharray="3 3"
              style={{
                transform: `translateX(${activeIndex !== null ? xFor(activeIndex) : xFor(series.length - 1)}px)`,
                opacity: activeIndex !== null ? 1 : 0,
                transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease',
              }}
            />

            {activeKinds.map((kind) => {
              const meta = FINANCE_META[kind];
              const points = series.map((bucket, index) => ({ x: xFor(index), y: yFor(bucket[kind]) }));
              const line = monotonePath(points);
              const first = points[0];
              const last = points[points.length - 1];
              const area =
                first && last && points.length > 1
                  ? `${line} L${last.x},${baselineY} L${first.x},${baselineY} Z`
                  : '';

              return (
                <g key={`${kind}-${dataSignature}`} clipPath={`url(#${idPrefix}-clip-${kind})`}>
                  {area && <path d={area} fill={`url(#${idPrefix}-area-${kind})`} stroke="none" />}
                  <path
                    d={line}
                    fill="none"
                    style={{ stroke: meta.color }}
                    strokeWidth={2.5}
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
                      size={activeIndex === index ? 6.5 : 4.5}
                      className="animate-mark-pop"
                      style={{
                        transformBox: 'fill-box',
                        transformOrigin: 'center',
                        animationDelay: `${markDelay(index)}ms`,
                        transition: 'r 150ms ease, width 150ms ease, height 150ms ease',
                      }}
                    />
                  ))}
                </g>
              );
            })}

            {/* Direct labels on the newest point, per series. */}
            {endpointLabels.map((label) => {
              const markerX = xFor(series.length - 1);
              const markerY = yFor(label.value);
              return (
                <g key={`label-${label.kind}`} className="animate-fade-up" style={{ animationDelay: `${REVEAL_MS * 0.8}ms` }}>
                  {Math.abs(label.y - markerY) > 2 && (
                    <line
                      x1={markerX + 7}
                      y1={markerY}
                      x2={padding.left + innerWidth + 8}
                      y2={label.y}
                      className="stroke-chart-leader"
                      strokeWidth={1}
                    />
                  )}
                  <text
                    x={padding.left + innerWidth + 12}
                    y={label.y + 4}
                    fontSize={11}
                    fontWeight={600}
                    className="fill-text-secondary"
                  >
                    {formatCompactCurrency(label.value)}
                  </text>
                </g>
              );
            })}

            {/* Baseline last, so it sits above the gridlines. */}
            <line
              x1={padding.left}
              y1={baselineY}
              x2={padding.left + innerWidth}
              y2={baselineY}
              className="stroke-chart-baseline"
              strokeWidth={1}
            />
          </svg>
        )}

        {!hasData && width > 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-body text-text-secondary">
            Nenhum registro nos últimos {series.length} meses.
          </p>
        )}

        {activeBucket && (
          <div
            className="pointer-events-none absolute z-10 min-w-[200px] animate-fade-up rounded-input border border-border bg-surface-2 p-3 shadow-elevated"
            style={{
              left: Math.min(Math.max(xFor(activeIndex!) - 100, 4), Math.max(4, width - 208)),
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
                    <span className="text-body-strong tabular-nums text-text-primary">
                      {formatCurrency(activeBucket[kind])}
                    </span>
                  </li>
                );
              })}
              {activeKinds.length > 1 && visible.income && visible.expense && (
                <li className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-1.5">
                  <span className="text-caption text-text-secondary" title="Receitas menos despesas">
                    Lucro
                  </span>
                  <span
                    className={`whitespace-nowrap text-body-strong tabular-nums ${
                      activeBucket.net >= 0 ? 'text-finance-income' : 'text-danger'
                    }`}
                  >
                    {formatCurrency(activeBucket.net)}
                  </span>
                </li>
              )}
              {activeKinds.length === 0 && <li className="text-caption text-text-secondary">Nenhuma linha ativa.</li>}
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
          {showTable ? 'Ocultar tabela' : 'Ver em tabela'}
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
                  <th scope="col" className="py-2 text-right text-caption font-semibold text-text-secondary">
                    Lucro
                  </th>
                </tr>
              </thead>
              <tbody>
                {series.map((bucket) => (
                  <tr key={bucket.key} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="py-2 pr-3 text-body font-normal text-text-primary">
                      {bucket.fullLabel}
                    </th>
                    {FINANCE_KIND_ORDER.map((kind) => (
                      <td key={kind} className="py-2 pr-3 text-right text-body tabular-nums text-text-primary">
                        {formatCurrency(bucket[kind])}
                      </td>
                    ))}
                    <td
                      className={`py-2 text-right text-body-strong tabular-nums ${
                        bucket.net >= 0 ? 'text-finance-income' : 'text-danger'
                      }`}
                    >
                      {formatCurrency(bucket.net)}
                    </td>
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
