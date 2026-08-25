/**
 * The progress bar itself.
 *
 * It uses the app's own accent rather than one of the three ledger hues —
 * verde, vermelho and azul mean lucro, gasto and investimento everywhere
 * else, and a meta is none of those.
 */
export function GoalProgressBar({
  percent,
  color,
  height = 10,
}: {
  /** 0..1. */
  percent: number;
  color: string;
  height?: number;
}) {
  const clamped = Math.min(1, Math.max(0, percent));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progresso da meta"
      className="w-full overflow-hidden rounded-full bg-border"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-gentle"
        style={{ width: `${clamped * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}
