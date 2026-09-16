import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Button } from '@/components/ui/Button';
import { useAddContribution } from '@/hooks/useGoals';
import { useCreateFinanceEntry } from '@/hooks/useFinance';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { GoalProgress } from '@/types';
import { formatCurrency, toDateInputValue, parseDateInput } from '@/utils/formatters';

const PRESETS = [50, 100, 200, 500];

interface AddContributionModalProps {
  progress: GoalProgress | null;
  onOpenChange: (open: boolean) => void;
}

/** "Adicionar um valor a qualquer momento" — the whole point of a meta. */
export function AddContributionModal({ progress, onOpenChange }: AddContributionModalProps) {
  const addContribution = useAddContribution();
  const createEntry = useCreateFinanceEntry();
  const toast = useToast();
  const linked = progress?.linkedBox;
  const isPending = addContribution.isPending || createEntry.isPending;

  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!progress) return;

    if (amount <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    setError(undefined);

    try {
      if (linked) {
        // The goal mirrors a cofrinho: the money goes into the pot, and the
        // goal's progress follows on its own.
        await createEntry.mutateAsync({
          kind: 'investment',
          description: note.trim() || `Depósito · ${linked.name}`,
          amount,
          date,
          cdiPercent: linked.cdiPercent,
          boxId: linked.id,
        });
      } else {
        await addContribution.mutateAsync({
          goalId: progress.goal.id,
          amount,
          date: parseDateInput(date)?.toISOString(),
          note: note.trim() || undefined,
        });
      }

      const remainingAfter = Math.max(0, progress.remaining - amount);
      toast.success(
        remainingAfter === 0
          ? `Meta "${progress.goal.title}" alcançada! 🎉`
          : `Valor adicionado. Faltam ${formatCurrency(remainingAfter)}.`
      );

      setAmount(0);
      setNote('');
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível adicionar o valor.'));
    }
  };

  return (
    <Modal
      open={Boolean(progress)}
      onOpenChange={onOpenChange}
      title={progress ? `Adicionar a "${progress.goal.title}"` : 'Adicionar valor'}
      description={
        linked
          ? `Vai para o cofrinho "${linked.name}" (${linked.cdiPercent}% do CDI) — a meta acompanha o saldo dele.`
          : undefined
      }
      preventOutsideClose={isPending}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <CurrencyInput label="Valor" value={amount} onChange={setAmount} error={error} />

        {/* Two taps that cover most deposits, without hunting for the keypad. */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount((current) => current + preset)}
              className="h-9 rounded-badge border border-border bg-surface px-3 text-caption font-semibold text-text-primary transition-colors hover:border-sage-green/60"
            >
              + {formatCurrency(preset)}
            </button>
          ))}
          {progress && progress.remaining > 0 && (
            <button
              type="button"
              onClick={() => setAmount(progress.remaining)}
              className="h-9 rounded-badge border border-sage-green/40 bg-tint px-3 text-caption font-semibold text-brand transition-colors hover:border-sage-green"
            >
              Faltante ({formatCurrency(progress.remaining)})
            </button>
          )}
        </div>

        <Input label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Nota" placeholder="Opcional" value={note} onChange={(e) => setNote(e.target.value)} />

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isPending}>
            {linked ? 'Guardar no cofrinho' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
