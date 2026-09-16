import { Modal } from '@/components/ui/Modal';
import { FinanceForm, FinanceFormValues } from './FinanceForm';
import { useCreateFinanceEntry, useUpdateFinanceEntry } from '@/hooks/useFinance';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { FinanceEntry, FinanceKind } from '@/types';
import { FINANCE_META } from '@/utils/financeMeta';
import { installmentCount, paidInstallmentCount } from '@/utils/finance';
import { toDateInputValue } from '@/utils/formatters';

interface FinanceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: FinanceEntry;
  /** Set by the ledger pages so the tipo picker stays out of the way. */
  lockedKind?: FinanceKind;
  /** Pre-selects a cofrinho on a new investimento. */
  defaultBoxId?: string;
}

export function FinanceFormModal({
  open,
  onOpenChange,
  entry,
  lockedKind,
  defaultBoxId,
}: FinanceFormModalProps) {
  const createEntry = useCreateFinanceEntry();
  const updateEntry = useUpdateFinanceEntry();
  const toast = useToast();

  const isEditing = Boolean(entry);
  const isSubmitting = createEntry.isPending || updateEntry.isPending;
  const kind = entry?.kind ?? lockedKind;
  const label = kind ? FINANCE_META[kind].label.toLowerCase() : 'registro';

  const handleSubmit = async (values: FinanceFormValues) => {
    const isCard = values.kind === 'expense' && values.paymentMethod === 'card';
    const installments = isCard ? Math.max(1, values.installments ?? 1) : 1;
    // One number drives both flags: for a parcelado it is what the stepper
    // says; for pix / à vista the checkbox maps to "all" or "none".
    const paidInstallments =
      installments > 1 ? Math.min(installments, values.paidInstallments ?? 0) : values.paid ? 1 : 0;

    const payload = {
      kind: values.kind,
      description: values.description,
      amount: values.amount,
      date: values.date,
      category: values.category || undefined,
      notes: values.notes || undefined,
      paid: paidInstallments >= installments,
      paymentMethod: values.paymentMethod,
      installments,
      paidInstallments,
      cdiPercent: values.cdiPercent,
      boxId: values.kind === 'investment' ? values.boxId || undefined : undefined,
    };

    try {
      if (isEditing && entry) {
        await updateEntry.mutateAsync({ id: entry.id, payload });
      } else {
        await createEntry.mutateAsync(payload);
      }
      toast.success(isEditing ? 'Registro atualizado.' : 'Registro salvo.');
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar.'));
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
                installments: installmentCount(entry),
                paidInstallments: paidInstallmentCount(entry),
                cdiPercent: entry.cdiPercent ?? 100,
                boxId: entry.boxId ?? '',
              }
            : { kind: lockedKind, boxId: defaultBoxId ?? '' }
        }
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? 'Salvar alterações' : 'Salvar'}
      />
    </Modal>
  );
}
