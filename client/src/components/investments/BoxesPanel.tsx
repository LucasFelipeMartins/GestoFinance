import { useState } from 'react';
import {
  PiggyBank,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  LineChart,
  Pencil,
  Trash2,
  TrendingUp,
  Flag,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ActionsMenu } from '@/components/ui/ActionsMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useBoxes, useDeleteBox } from '@/hooks/useBoxes';
import { useGoals } from '@/hooks/useGoals';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { BoxSummary, GoalProgress, InvestmentBox } from '@/types';
import { estimateBoxMonthlyYield, readStoredAnnualCdi } from '@/utils/finance';
import { formatCurrency, formatRelativeDate } from '@/utils/formatters';
import { SimulatorSeed } from '@/components/finance/InvestmentSimulator';
import { BOX_PALETTE } from './boxColors';
import { BoxFormModal } from './BoxFormModal';
import { BoxMoveModal, BoxMove } from './BoxMoveModal';

interface BoxesPanelProps {
  /** Total of every investimento, pots included — to show what sits outside them. */
  totalInvested: number;
  onSimulate: (seed: SimulatorSeed) => void;
}

/**
 * Cofrinhos, at the top of Investimentos: each pot with its balance, what
 * it yields a month, and one-tap guardar / resgatar / simular. The money in
 * them is ordinary investment entries, so Home keeps showing one total.
 */
export function BoxesPanel({ totalInvested, onSimulate }: BoxesPanelProps) {
  const { data: boxes, isLoading } = useBoxes();
  const goals = useGoals().data ?? [];
  const deleteBox = useDeleteBox();
  const toast = useToast();
  const annualCdi = readStoredAnnualCdi();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InvestmentBox | undefined>();
  const [move, setMove] = useState<{ summary: BoxSummary; mode: BoxMove } | undefined>();
  const [deleting, setDeleting] = useState<BoxSummary | undefined>();

  const inBoxes = (boxes ?? []).reduce((sum, item) => sum + item.balance, 0);
  const loose = totalInvested - inBoxes;

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteBox.mutateAsync(deleting.box.id);
      toast.success(
        deleting.balance > 0
          ? `Cofrinho removido. ${formatCurrency(deleting.balance)} continuam como investimento avulso.`
          : 'Cofrinho removido.'
      );
      setDeleting(undefined);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível remover o cofrinho.'));
    }
  };

  return (
    <section aria-labelledby="boxes-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="boxes-title" className="flex items-center gap-2 text-h3 text-text-primary">
            <PiggyBank size={20} className="text-finance-investment" />
            Cofrinhos
          </h2>
          <p className="mt-0.5 text-caption text-text-secondary">
            {boxes && boxes.length > 0
              ? `${formatCurrency(inBoxes)} guardados em ${boxes.length} cofrinho${boxes.length === 1 ? '' : 's'}${
                  loose > 0.005 ? ` · ${formatCurrency(loose)} em aplicações avulsas` : ''
                }`
              : 'Separe o dinheiro por objetivo, cada um com o próprio rendimento — como as caixinhas do banco.'}
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus size={16} />} onClick={openCreate}>
          Novo cofrinho
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : boxes && boxes.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {boxes.map((summary) => (
            <BoxCard
              key={summary.box.id}
              summary={summary}
              monthlyYield={estimateBoxMonthlyYield(summary.balance, summary.box.cdiPercent, annualCdi)}
              linkedGoal={goals.find((p) => p.goal.boxId === summary.box.id)}
              onDeposit={() => setMove({ summary, mode: 'deposit' })}
              onWithdraw={() => setMove({ summary, mode: 'withdraw' })}
              onSimulate={() =>
                onSimulate({
                  amount: Math.max(0, summary.balance),
                  cdiPercent: summary.box.cdiPercent,
                  description: summary.box.name,
                })
              }
              onEdit={() => {
                setEditing(summary.box);
                setFormOpen(true);
              }}
              onDelete={() => setDeleting(summary)}
            />
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={openCreate}
          className="flex w-full flex-col items-center gap-2 rounded-card border border-dashed border-border bg-surface/60 px-4 py-8 text-center transition-colors hover:border-sage-green"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-finance-investment-soft text-finance-investment">
            <PiggyBank size={20} />
          </span>
          <span className="text-body-strong text-text-primary">Crie seu primeiro cofrinho</span>
          <span className="max-w-md text-caption text-text-secondary">
            "Reserva de emergência", "Viagem"… Guarde dinheiro em cada um, veja quanto rende e simule o futuro
            de cada objetivo separadamente.
          </span>
        </button>
      )}

      {formOpen && (
        <BoxFormModal key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} box={editing} />
      )}
      {move && (
        <BoxMoveModal
          key={`${move.summary.box.id}-${move.mode}`}
          open
          onOpenChange={(open) => !open && setMove(undefined)}
          summary={move.summary}
          mode={move.mode}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Remover cofrinho?"
        description={
          deleting && deleting.balance > 0
            ? `Os ${formatCurrency(deleting.balance)} de "${deleting.box.name}" não somem: viram aplicações avulsas e continuam no total investido.`
            : `"${deleting?.box.name ?? ''}" será removido.`
        }
        confirmLabel="Remover"
        onConfirm={confirmDelete}
        isLoading={deleteBox.isPending}
      />
    </section>
  );
}

interface BoxCardProps {
  summary: BoxSummary;
  monthlyYield: number;
  linkedGoal?: GoalProgress;
  onDeposit: () => void;
  onWithdraw: () => void;
  onSimulate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function BoxCard({
  summary,
  monthlyYield,
  linkedGoal,
  onDeposit,
  onWithdraw,
  onSimulate,
  onEdit,
  onDelete,
}: BoxCardProps) {
  const { box, balance, movements, lastMovementAt } = summary;
  const palette = BOX_PALETTE[box.color] ?? BOX_PALETTE.sage;

  return (
    <Card className="flex flex-col gap-4" style={{ borderTop: `4px solid ${palette.main}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]"
            style={{ backgroundColor: palette.soft, color: palette.main }}
          >
            <PiggyBank size={22} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-body-strong text-text-primary">{box.name}</h3>
            <p className="text-caption text-text-secondary">
              {box.cdiPercent}% do CDI
              {lastMovementAt ? ` · último movimento ${formatRelativeDate(lastMovementAt)}` : ' · vazio'}
            </p>
          </div>
        </div>
        <ActionsMenu
          items={[
            { label: 'Simular rendimento', icon: <LineChart size={16} />, onSelect: onSimulate },
            { label: 'Editar', icon: <Pencil size={16} />, onSelect: onEdit },
            {
              label: 'Remover',
              icon: <Trash2 size={16} />,
              onSelect: onDelete,
              danger: true,
              separatorBefore: true,
            },
          ]}
        />
      </div>

      <div>
        <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">Guardado</p>
        <p className="text-h2 tabular-nums text-text-primary">{formatCurrency(balance)}</p>
        {linkedGoal && (
          <p className="mt-0.5 flex items-center gap-1 text-caption text-text-secondary">
            <Flag size={13} style={{ color: palette.main }} />
            Meta "{linkedGoal.goal.title}": {Math.round(linkedGoal.percent * 100)}% de{' '}
            {formatCurrency(linkedGoal.goal.targetAmount)}
          </p>
        )}
        <p className="mt-0.5 flex items-center gap-1 text-caption text-text-secondary">
          <TrendingUp size={13} style={{ color: palette.main }} />
          {balance > 0
            ? `Rende cerca de ${formatCurrency(monthlyYield)} por mês`
            : 'Guarde algo para ver quanto rende'}
          {movements > 0 ? ` · ${movements} movimento${movements === 1 ? '' : 's'}` : ''}
        </p>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <Button size="sm" leftIcon={<ArrowDownToLine size={15} />} onClick={onDeposit}>
          Guardar
        </Button>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<ArrowUpFromLine size={15} />}
          onClick={onWithdraw}
          disabled={balance <= 0}
        >
          Resgatar
        </Button>
      </div>
    </Card>
  );
}
