import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Button } from '@/components/ui/Button';
import { useCreateFinanceEntry } from '@/hooks/useFinance';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { BoxSummary } from '@/types';
import { formatCurrency, toDateInputValue } from '@/utils/formatters';

export type BoxMove = 'deposit' | 'withdraw';

interface BoxMoveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: BoxSummary;
  mode: BoxMove;
}

/**
 * "Guardar" and "Resgatar" on a cofrinho. Both write a plain investimento
 * entry tied to the pot — a resgate is the same entry with a negative
 * amount — so the ledger, the chart and the Home total all see the money
 * move without any special path.
 */
export function BoxMoveModal({ open, onOpenChange, summary, mode }: BoxMoveModalProps) {
  const createEntry = useCreateFinanceEntry();
  const toast = useToast();
  const { box, balance } = summary;
  const isDeposit = mode === 'deposit';

  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string>();

  const submit = async () => {
    if (!(amount > 0)) {
      setError('Informe um valor maior que zero.');
      return;
    }
    if (!isDeposit && amount > balance + 0.005) {
      setError(`Este cofrinho tem ${formatCurrency(balance)}. Não dá para resgatar mais do que isso.`);
      return;
    }
    setError(undefined);
    try {
      await createEntry.mutateAsync({
        kind: 'investment',
        description: description.trim() || `${isDeposit ? 'Depósito' : 'Resgate'} · ${box.name}`,
        amount: isDeposit ? amount : -amount,
        date,
        cdiPercent: box.cdiPercent,
        boxId: box.id,
      });
      toast.success(
        isDeposit
          ? `${formatCurrency(amount)} guardados em ${box.name}.`
          : `${formatCurrency(amount)} resgatados de ${box.name}.`
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível registrar.'));
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isDeposit ? `Guardar em ${box.name}` : `Resgatar de ${box.name}`}
      description={
        isDeposit
          ? `Rende ${box.cdiPercent}% do CDI. Saldo atual: ${formatCurrency(balance)}.`
          : `Saldo disponível: ${formatCurrency(balance)}. O valor sai do total investido.`
      }
      preventOutsideClose={createEntry.isPending}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={createEntry.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            isLoading={createEntry.isPending}
            leftIcon={isDeposit ? <ArrowDownToLine size={17} /> : <ArrowUpFromLine size={17} />}
          >
            {isDeposit ? 'Guardar' : 'Resgatar'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <CurrencyInput label="Valor" value={amount} onChange={setAmount} error={error} autoFocus />
        <Input label="Data" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Input
          label="Descrição (opcional)"
          placeholder={isDeposit ? `Depósito · ${box.name}` : `Resgate · ${box.name}`}
          value={description}
          maxLength={200}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
    </Modal>
  );
}
