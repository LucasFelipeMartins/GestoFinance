import { PlusCircle, X, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { GoalProgressBar } from './GoalProgressBar';
import { useDeleteContribution, useDeleteGoal } from '@/hooks/useGoals';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { GoalProgress } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { GOAL_ACCENT, GOAL_DONE } from './goalColors';

interface GoalDetailModalProps {
  progress: GoalProgress | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (progress: GoalProgress) => void;
  onAddValue: (progress: GoalProgress) => void;
}

export function GoalDetailModal({ progress, onOpenChange, onEdit, onAddValue }: GoalDetailModalProps) {
  const deleteGoal = useDeleteGoal();
  const deleteContribution = useDeleteContribution();
  const toast = useToast();

  if (!progress) {
    return <Modal open={false} onOpenChange={onOpenChange} title="Meta" children={null} />;
  }

  const { goal } = progress;
  const accent = progress.isComplete ? GOAL_DONE : progress.isOverdue ? '#D93A3A' : GOAL_ACCENT;

  const handleDeleteGoal = async () => {
    try {
      await deleteGoal.mutateAsync(goal.id);
      toast.success('Meta removida.');
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível remover a meta.'));
    }
  };

  const handleDeleteContribution = async (id: string) => {
    try {
      await deleteContribution.mutateAsync(id);
      toast.success('Depósito removido.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível remover o depósito.'));
    }
  };

  return (
    <Modal open onOpenChange={onOpenChange} title={goal.title} description={`Prazo: ${formatDate(goal.targetDate)}`}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-display text-text-primary">{formatCurrency(progress.saved)}</p>
          <p className="text-body text-text-secondary">de {formatCurrency(goal.targetAmount)}</p>

          <div className="mt-3">
            <GoalProgressBar percent={progress.percent} color={accent} height={12} />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-body-strong" style={{ color: accent }}>
              {Math.round(progress.percent * 100)}%
            </span>
            <span className="text-caption text-text-secondary">
              {progress.isComplete
                ? 'Meta alcançada!'
                : `Faltam ${formatCurrency(progress.remaining)} · ${formatCurrency(progress.monthlyNeeded)}/mês`}
            </span>
          </div>
        </div>

        {goal.notes && <p className="text-body text-text-secondary">{goal.notes}</p>}

        <Button leftIcon={<PlusCircle size={18} />} onClick={() => onAddValue(progress)} className="w-full">
          Adicionar valor
        </Button>

        <div>
          <h4 className="text-body-strong text-text-primary">Depósitos</h4>
          {progress.contributions.length === 0 ? (
            <p className="mt-2 text-caption text-text-secondary">Nenhum valor adicionado ainda.</p>
          ) : (
            <ul className="mt-2 flex flex-col divide-y divide-border">
              {progress.contributions.map((contribution) => (
                <li key={contribution.id} className="flex items-center gap-3 py-2">
                  <PlusCircle size={16} className="shrink-0 text-sage-green" />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-strong text-text-primary">{formatCurrency(contribution.amount)}</p>
                    <p className="truncate text-caption text-text-secondary">
                      {formatDate(contribution.date)}
                      {contribution.note ? ` · ${contribution.note}` : ''}
                    </p>
                  </div>
                  <IconButton
                    icon={<X size={16} />}
                    label="Remover este depósito"
                    variant="danger"
                    onClick={() => handleDeleteContribution(contribution.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            leftIcon={<Pencil size={17} />}
            className="flex-1"
            onClick={() => onEdit(progress)}
          >
            Editar meta
          </Button>
          <Button
            variant="danger"
            leftIcon={<Trash2 size={17} />}
            className="flex-1"
            isLoading={deleteGoal.isPending}
            onClick={handleDeleteGoal}
          >
            Remover
          </Button>
        </div>
      </div>
    </Modal>
  );
}
