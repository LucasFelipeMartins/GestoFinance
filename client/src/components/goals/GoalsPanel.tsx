import { useState } from 'react';
import { Flag, Plus, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { GoalProgressBar } from './GoalProgressBar';
import { GoalFormModal } from './GoalFormModal';
import { AddContributionModal } from './AddContributionModal';
import { GoalDetailModal } from './GoalDetailModal';
import { useGoals } from '@/hooks/useGoals';
import { Goal, GoalProgress } from '@/types';
import { formatCurrency, formatDate, formatRelativeDate } from '@/utils/formatters';
import { GOAL_ACCENT, GOAL_DONE } from './goalColors';

/**
 * Metas: what the user is saving for, and how close they are.
 *
 * Sits right under the chart on Home, because a goal is the one financial
 * number that is about the future rather than the past.
 */
export function GoalsPanel({ limit = 4 }: { limit?: number }) {
  const { data: goals, isLoading } = useGoals();

  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();
  const [addingTo, setAddingTo] = useState<GoalProgress | null>(null);
  const [detail, setDetail] = useState<GoalProgress | null>(null);

  // The modals hold a snapshot, so re-read the live version after a mutation
  // rather than showing numbers that stopped being true.
  const liveDetail = detail ? goals?.find((g) => g.goal.id === detail.goal.id) ?? null : null;

  const openAdd = () => {
    setEditingGoal(undefined);
    setFormOpen(true);
  };

  if (isLoading) {
    return <SkeletonCard />;
  }

  const all = goals ?? [];
  const visible = all.slice(0, limit);
  const open = all.filter((g) => !g.isComplete).length;
  const done = all.length - open;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-h3 text-text-primary">
            <Flag size={19} className="text-sage-green" />
            Metas
          </h3>
          <p className="mt-0.5 text-caption text-text-secondary">
            {all.length === 0
              ? 'Defina um objetivo e acompanhe o quanto falta'
              : `${open} em andamento · ${done} concluída(s)`}
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus size={16} />} onClick={openAdd} className="shrink-0">
          Nova meta
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-input border border-dashed border-border px-4 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tea-green/50 text-sage-green">
            <Flag size={20} />
          </span>
          <p className="text-body text-text-secondary">
            Nenhuma meta ainda. Crie uma — &ldquo;Viajar&rdquo;, R$ 1.200, em 5 meses — e adicione
            valores quando quiser.
          </p>
          <Button size="sm" variant="secondary" leftIcon={<Plus size={16} />} onClick={openAdd}>
            Criar meta
          </Button>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {visible.map((progress) => (
            <GoalRow
              key={progress.goal.id}
              progress={progress}
              onOpen={() => setDetail(progress)}
              onAddValue={() => setAddingTo(progress)}
            />
          ))}
        </ul>
      )}

      {all.length > visible.length && (
        <p className="mt-3 text-caption text-text-secondary">
          + {all.length - visible.length} outra(s) meta(s)
        </p>
      )}

      <GoalFormModal
        key={editingGoal?.id ?? 'new-goal'}
        open={formOpen}
        onOpenChange={setFormOpen}
        goal={editingGoal}
      />
      <AddContributionModal
        key={addingTo?.goal.id ?? 'no-contribution'}
        progress={addingTo}
        onOpenChange={(open) => !open && setAddingTo(null)}
      />
      <GoalDetailModal
        progress={liveDetail}
        onOpenChange={(open) => !open && setDetail(null)}
        onEdit={(progress) => {
          setDetail(null);
          setEditingGoal(progress.goal);
          setFormOpen(true);
        }}
        onAddValue={(progress) => {
          setDetail(null);
          setAddingTo(progress);
        }}
      />
    </Card>
  );
}

function GoalRow({
  progress,
  onOpen,
  onAddValue,
}: {
  progress: GoalProgress;
  onOpen: () => void;
  onAddValue: () => void;
}) {
  const { goal } = progress;
  const accent = progress.isComplete ? GOAL_DONE : progress.isOverdue ? '#D93A3A' : GOAL_ACCENT;

  const deadlineLabel = progress.isComplete
    ? 'Meta alcançada!'
    : progress.isOverdue
      ? `Prazo venceu em ${formatDate(goal.targetDate)}`
      : `${
          progress.monthsLeft === 0
            ? `Vence ${formatRelativeDate(goal.targetDate).toLowerCase()}`
            : progress.monthsLeft === 1
              ? 'Falta 1 mês'
              : `Faltam ${progress.monthsLeft} meses`
        } · ${formatCurrency(progress.monthlyNeeded)}/mês`;

  return (
    <li className="rounded-input border border-border p-4 transition-colors hover:border-sage-green/50">
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-body-strong text-text-primary">
              {goal.title}
              {progress.isComplete && <CheckCircle2 size={15} style={{ color: GOAL_DONE }} />}
            </p>
            <p
              className="truncate text-caption"
              style={{ color: progress.isOverdue && !progress.isComplete ? '#D93A3A' : undefined }}
            >
              <span className={progress.isOverdue && !progress.isComplete ? '' : 'text-text-secondary'}>
                {deadlineLabel}
              </span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-body-strong text-text-primary">{formatCurrency(progress.saved)}</p>
            <p className="text-caption text-text-secondary">de {formatCurrency(goal.targetAmount)}</p>
          </div>
        </div>

        <div className="mt-3">
          <GoalProgressBar percent={progress.percent} color={accent} />
        </div>
      </button>

      <div className="mt-2 flex items-center gap-3">
        <span className="text-caption font-bold" style={{ color: accent }}>
          {Math.round(progress.percent * 100)}%
        </span>
        <span className="min-w-0 flex-1 truncate text-caption text-text-secondary">
          {progress.isComplete ? 'Nada mais a juntar' : `Faltam ${formatCurrency(progress.remaining)}`}
        </span>
        {!progress.isComplete && (
          <Button size="sm" variant="secondary" leftIcon={<Plus size={15} />} onClick={onAddValue}>
            Adicionar
          </Button>
        )}
      </div>
    </li>
  );
}
