import { Modal } from '@/components/ui/Modal';
import { FinanceForm, FinanceFormValues } from './FinanceForm';
import { useCreateFinanceEntry, useUpdateFinanceEntry } from '@/hooks/useFinance';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { FinanceEntry, FinanceKind } from '@/types';
import { FINANCE_META } from '@/utils/financeMeta';
import { toDateInputValue } from '@/utils/formatters';

interface FinanceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: FinanceEntry;
  /** Set by the ledger pages so the tipo picker stays out of the way. */
  lockedKind?: FinanceKind;
}

export function FinanceFormModal({ open, onOpenChange, entry, lockedKind }: FinanceFormModalProps) {
  const createEntry = useCreateFinanceEntry();
  const updateEntry = useUpdateFinanceEntry();
  const toast = useToast();

  const isEditing = Boolean(entry);
  const isSubmitting = createEntry.isPending || updateEntry.isPending;
  const kind = entry?.kind ?? lockedKind;
  const label = kind ? FINANCE_META[kind].label.toLowerCase() : 'lançamento';

  const handleSubmit = async (values: FinanceFormValues) => {
    const payload = {
      kind: values.kind,
      description: values.description,
      amount: values.amount,
      date: values.date,
      category: values.category || undefined,
      notes: values.notes || undefined,
      paid: values.paid ?? false,
      paymentMethod: values.paymentMethod,
      installments: values.installments,
      cdiPercent: values.cdiPercent,
    };

    try {
      if (isEditing && entry) {
        await updateEntry.mutateAsync({ id: entry.id, payload });
      } else {
        await createEntry.mutateAsync(payload);
      }
      toast.success(isEditing ? 'Lançamento atualizado.' : 'Lançamento criado.');
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o lançamento.'));
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? `Editar ${label}` : `Adicionar ${label}`}
      size="lg"
      preventOutsideClose={isSubmitting}
    >
      <FinanceForm
        key={entry?.id ?? `new-${lockedKind ?? 'any'}`}
        lockedKind={lockedKind}
        defaultValues={
          entry
            ? {
                kind: entry.kind,
                description: entry.description,
                amount: entry.amount,
                date: toDateInputValue(entry.date),
                category: entry.category ?? '',
                notes: entry.notes ?? '',
                paid: entry.paid,
                paymentMethod: entry.paymentMethod ?? 'pix',
                installments: entry.installments ?? 1,
                cdiPercent: entry.cdiPercent ?? 100,
              }
            : { kind: lockedKind }
        }
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? 'Salvar alterações' : 'Salvar lançamento'}
      />
    </Modal>
  );
}
