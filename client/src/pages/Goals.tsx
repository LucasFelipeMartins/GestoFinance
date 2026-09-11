import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Flag, CheckCircle2, PiggyBank, Target } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatGrid, StatTile } from '@/components/ui/StatTile';
import { FilterBar, FilterSelect } from '@/components/ui/FilterBar';
import { GoalProgressBar } from '@/components/goals/GoalProgressBar';
import { GoalFormModal } from '@/components/goals/GoalFormModal';
import { AddContributionModal } from '@/components/goals/AddContributionModal';
import { GoalDetailModal } from '@/components/goals/GoalDetailModal';
import { useGoals } from '@/hooks/useGoals';
import { Goal, GoalProgress } from '@/types';
import { formatCurrency, formatDate, formatRelativeDate } from '@/utils/formatters';
import { GOAL_ACCENT, GOAL_DONE, GOAL_OVERDUE } from '@/components/goals/goalColors';

type Filter = 'all' | 'open' | 'done';

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: 'Em andamento' },
  { value: 'done', label: 'Concluídas' },
];

export default function Goals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: goals, isLoading } = useGoals();

  const [filter, setFilter] = useState<Filter>('all');
  const [formOpen, setFormOpen] = useState(searchParams.get('new') === '1');
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();
  const [addingTo, setAddingTo] = useState<GoalProgress | null>(null);
  const [detail, setDetail] = useState<GoalProgress | null>(null);

  // The modals hold a snapshot, so re-read the live version after a mutation
  // rather than showing numbers that stopped being true.
  const liveDetail = detail ? (goals?.find((g) => g.goal.id === detail.goal.id) ?? null) : null;

  if (searchParams.get('new') === '1') {
    searchParams.delete('new');
    setSearchParams(searchParams, { replace: true });
  }

  const all = useMemo(() => goals ?? [], [goals]);

  const totals = useMemo(() => {
    const open = all.filter((g) => !g.isComplete);
    return {
      openCount: open.length,
      doneCount: all.length - open.length,
      targetTotal: all.reduce((sum, g) => sum + g.goal.targetAmount, 0),
      savedTotal: all.reduce((sum, g) => sum + g.saved, 0),
      // What every open goal needs this month, added up — the number that
      // says whether the whole set is realistic.
      monthlyTotal: open.reduce((sum, g) => sum + g.monthlyNeeded, 0),
    };
  }, [all]);

  const visible = all.filter((progress) => {
    if (filter === 'open') return !progress.isComplete;
    if (filter === 'done') return progress.isComplete;
    return true;
  });

  const openAdd = () => {
    setEditingGoal(undefined);
    setFormOpen(true);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Metas" subtitle="Objetivos e o quanto falta para cada um." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Metas"
        subtitle="Defina um objetivo, um valor e um prazo — e vá guardando dinheiro quando quiser."
        action={
          <Button leftIcon={<Plus size={18} />} onClick={openAdd}>
            Nova meta
          </Button>
        }
      />

      <StatGrid columns={3}>
        <StatTile
          icon={<Target size={18} />}
          label="Em andamento"
          value={String(totals.openCount)}
          caption={`${totals.doneCount} já concluída${totals.doneCount === 1 ? '' : 's'}`}
        />
        <StatTile
          icon={<PiggyBank size={18} />}
          label="Já guardado"
          value={formatCurrency(totals.savedTotal)}
          caption={`de ${formatCurrency(totals.targetTotal)} no total`}
        />
        <StatTile
          icon={<Flag size={18} />}
          label="Guardar por mês"
          value={formatCurrency(totals.monthlyTotal)}
          caption="Para todas as metas em aberto chegarem no prazo"
        />
      </StatGrid>

      {all.length > 0 && (
        <FilterBar>
          <FilterSelect
            options={FILTER_OPTIONS}
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
            placeholder="Mostrar"
          />
        </FilterBar>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<Flag size={26} />}
          title={all.length === 0 ? 'Nenhuma meta ainda' : 'Nenhuma meta neste filtro'}
          description={
            all.length === 0
              ? 'Crie uma meta — "Viajar", R$ 1.200, em 5 meses — e vá adicionando valores quando quiser.'
              : 'Troque o filtro para ver as outras metas.'
          }
          action={
            all.length === 0 ? (
              <Button leftIcon={<Plus size={18} />} onClick={openAdd}>
                Criar meta
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setFilter('all')}>
                Ver todas
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((progress) => (
            <GoalCard
              key={progress.goal.id}
              progress={progress}
              onOpen={() => setDetail(progress)}
              onAddValue={() => setAddingTo(progress)}
            />
          ))}
        </div>
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
    </PageContainer>
  );
}

/** The full-size card the dedicated page uses — roomier than the Home row,
 * with the deposit count and the prazo spelled out. */
function GoalCard({
  progress,
  onOpen,
  onAddValue,
}: {
  progress: GoalProgress;
  onOpen: () => void;
  onAddValue: () => void;
}) {
  const { goal } = progress;
  const accent = progress.isComplete ? GOAL_DONE : progress.isOverdue ? GOAL_OVERDUE : GOAL_ACCENT;

  const deadlineLabel = progress.isComplete
    ? 'Meta alcançada!'
    : progress.isOverdue
      ? `Prazo venceu em ${formatDate(goal.targetDate)}`
      : progress.monthsLeft === 0
        ? `Vence ${formatRelativeDate(goal.targetDate).toLowerCase()}`
        : progress.monthsLeft === 1
          ? 'Falta 1 mês'
          : `Faltam ${progress.monthsLeft} meses`;

  return (
    <Card className="flex flex-col">
      <button type="button" onClick={onOpen} className="text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 truncate text-h3 text-text-primary">
              {goal.title}
              {progress.isComplete && <CheckCircle2 size={17} style={{ color: GOAL_DONE }} />}
            </h3>
            <p
              className={`mt-0.5 truncate text-caption ${
                progress.isOverdue && !progress.isComplete ? 'text-danger' : 'text-text-secondary'
              }`}
            >
              {deadlineLabel} · {formatDate(goal.targetDate)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-h3 tabular-nums text-text-primary">{formatCurrency(progress.saved)}</p>
            <p className="text-caption text-text-secondary">de {formatCurrency(goal.targetAmount)}</p>
          </div>
        </div>

        <div className="mt-4">
          <GoalProgressBar percent={progress.percent} color={accent} height={12} />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-body-strong tabular-nums" style={{ color: accent }}>
            {Math.round(progress.percent * 100)}%
          </span>
          <span className="min-w-0 flex-1 truncate text-caption text-text-secondary">
            {progress.isComplete
              ? 'Nada mais a juntar'
              : `Faltam ${formatCurrency(progress.remaining)} · ${formatCurrency(progress.monthlyNeeded)}/mês`}
          </span>
        </div>
      </button>

      {goal.notes && <p className="mt-3 text-caption text-text-secondary">{goal.notes}</p>}

      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <span className="min-w-0 flex-1 truncate text-caption text-text-secondary">
          {progress.contributions.length === 0
            ? 'Nenhum depósito ainda'
            : `${progress.contributions.length} depósito${progress.contributions.length > 1 ? 's' : ''}`}
        </span>
        {!progress.isComplete && (
          <Button size="sm" leftIcon={<Plus size={15} />} onClick={onAddValue}>
            Adicionar valor
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onOpen}>
          Detalhes
        </Button>
      </div>
    </Card>
  );
}
