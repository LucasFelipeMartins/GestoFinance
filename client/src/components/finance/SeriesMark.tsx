import { SeriesShape } from '@/utils/financeMeta';

interface SeriesMarkProps {
  shape: SeriesShape;
  color: string;
  cx: number;
  cy: number;
  /** Half-width of the mark. 5 gives a 10px marker — above the 8px floor. */
  size?: number;
  /** Painted as a ring so the mark stays legible where lines cross. */
  surface?: string;
}

/**
 * One data point. The shape carries series identity alongside the colour —
 * see FINANCE_META for why colour alone is not enough here.
 */
export function SeriesMark({ shape, color, cx, cy, size = 5, surface = '#FFFFFF' }: SeriesMarkProps) {
  const ring = { stroke: surface, strokeWidth: 2 };

  if (shape === 'square') {
    return (
      <rect
        x={cx - size}
        y={cy - size}
        width={size * 2}
        height={size * 2}
        rx={1.5}
        fill={color}
        {...ring}
      />
    );
  }

  if (shape === 'triangle') {
    const points = [
      `${cx},${cy - size * 1.2}`,
      `${cx + size * 1.15},${cy + size * 0.85}`,
      `${cx - size * 1.15},${cy + size * 0.85}`,
    ].join(' ');
    return <polygon points={points} fill={color} strokeLinejoin="round" {...ring} />;
  }

  return <circle cx={cx} cy={cy} r={size} fill={color} {...ring} />;
}

/** The same mark at legend/label size, as a standalone inline SVG. */
export function SeriesMarkKey({
  shape,
  color,
  size = 12,
  withLine,
}: {
  shape: SeriesShape;
  color: string;
  size?: number;
  /** Legends mirror the mark: lines get a short stroke through the shape. */
  withLine?: boolean;
}) {
  const box = withLine ? size + 12 : size;
  const center = box / 2;

  return (
    <svg width={box} height={size} viewBox={`0 0 ${box} ${size}`} aria-hidden="true" className="shrink-0">
      {withLine && (
        <line
          x1={0}
          y1={size / 2}
          x2={box}
          y2={size / 2}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
      <SeriesMark shape={shape} color={color} cx={center} cy={size / 2} size={size / 2.6} />
    </svg>
  );
}
