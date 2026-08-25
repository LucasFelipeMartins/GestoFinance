import { useState } from 'react';
import { PiggyBank } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Button } from '@/components/ui/Button';
import { useCreateGoal, useUpdateGoal } from '@/hooks/useGoals';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { Goal } from '@/types';
import { formatCurrency, formatDate, toDateInputValue, parseDateInput } from '@/utils/formatters';

const PRAZO_OPTIONS = [
  { value: '3', label: '3 meses' },
  { value: '5', label: '5 meses' },
  { value: '12', label: '1 ano' },
  { value: '24', label: '2 anos' },
];

function monthsBetween(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return months < 1 ? 1 : months;
}

function addMonths(months: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
}

interface GoalFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal;
}

export function GoalFormModal({ open, onOpenChange, goal }: GoalFormModalProps) {
  const isEditing = Boolean(goal);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const toast = useToast();

  const [title, setTitle] = useState(goal?.title ?? '');
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount ?? 0);
  const [notes, setNotes] = useState(goal?.notes ?? '');
  // The form asks for a prazo in months, which is how people think about it;
  // what gets stored is the resulting date, so it keeps meaning the same day
  // as time passes.
  const [months, setMonths] = useState(
    goal ? String(monthsBetween(new Date(), new Date(goal.targetDate))) : '5'
  );
  const [explicitDate, setExplicitDate] = useState(
    goal ? toDateInputValue(goal.targetDate) : ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const targetDate = explicitDate ? (parseDateInput(explicitDate) ?? addMonths(Number(months))) : addMonths(Number(months));
  const monthsToTarget = Math.max(1, monthsBetween(new Date(), targetDate));
  const isSubmitting = createGoal.isPending || updateGoal.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = 'Dê um nome para a meta.';
    if (targetAmount <= 0) nextErrors.targetAmount = 'Informe quanto você quer juntar.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      title: title.trim(),
      targetAmount,
      targetDate: targetDate.toISOString(),
      notes: notes.trim() || undefined,
    };

    try {
      if (isEditing && goal) {
        await updateGoal.mutateAsync({ id: goal.id, payload });
      } else {
        await createGoal.mutateAsync(payload);
      }
      toast.success(isEditing ? 'Meta atualizada.' : 'Meta criada.');
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar a meta.'));
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Editar meta' : 'Nova meta'}
      preventOutsideClose={isSubmitting}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Meta"
          placeholder="Ex: Viajar"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />

        <CurrencyInput
          label="Valor que quer juntar"
          value={targetAmount}
          onChange={setTargetAmount}
          error={errors.targetAmount}
        />

        <SegmentedControl
          label="Prazo"
          options={PRAZO_OPTIONS}
          value={months}
          onChange={(value) => {
            setMonths(value);
            // Picking a preset replaces whatever exact date was there.
            setExplicitDate('');
          }}
        />

        <Input
          label="Ou uma data exata"
          type="date"
          value={explicitDate || toDateInputValue(targetDate)}
          onChange={(e) => setExplicitDate(e.target.value)}
        />

        {targetAmount > 0 && (
          <p className="flex items-start gap-2 rounded-input bg-tea-green/25 px-3 py-2.5 text-caption text-text-secondary">
            <PiggyBank size={14} className="mt-0.5 shrink-0 text-sage-green" />
            Para chegar lá em {formatDate(targetDate)}, guarde cerca de{' '}
            <strong className="text-text-primary">{formatCurrency(targetAmount / monthsToTarget)}</strong> por mês.
          </p>
        )}

        <Textarea
          label="Observações"
          placeholder="Opcional"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Salvar alterações' : 'Criar meta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
