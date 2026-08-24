import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDeleteFinanceEntry } from '@/hooks/useFinance';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { FinanceEntry } from '@/types';
import { FINANCE_META } from '@/utils/financeMeta';

interface DeleteFinanceDialogProps {
  entry: FinanceEntry | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteFinanceDialog({ entry, onOpenChange, onDeleted }: DeleteFinanceDialogProps) {
  const deleteEntry = useDeleteFinanceEntry();
  const toast = useToast();

  const label = entry ? FINANCE_META[entry.kind].label.toLowerCase() : 'lançamento';

  const handleConfirm = async () => {
    if (!entry) return;
    try {
      await deleteEntry.mutateAsync(entry.id);
      toast.success('Lançamento removido.');
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível remover o lançamento.'));
    }
  };

  return (
    <ConfirmDialog
      open={Boolean(entry)}
      onOpenChange={onOpenChange}
      title={`Remover ${label}?`}
      description={`Essa ação não poderá ser desfeita${entry ? ` para "${entry.description}"` : ''}.`}
      confirmLabel="Remover"
      onConfirm={handleConfirm}
      isLoading={deleteEntry.isPending}
    />
  );
}
