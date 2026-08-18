import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDeleteClient } from '@/hooks/useClients';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { Client } from '@/types';

interface DeleteClientDialogProps {
  client: Client | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteClientDialog({ client, onOpenChange, onDeleted }: DeleteClientDialogProps) {
  const [tasksAction, setTasksAction] = useState<'unlink' | 'delete'>('unlink');
  const deleteClient = useDeleteClient();
  const toast = useToast();

  const handleConfirm = async () => {
    if (!client) return;
    try {
      await deleteClient.mutateAsync({ id: client._id, tasksAction });
      toast.success('Cliente removido.');
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível remover o cliente.'));
    }
  };

  return (
    <ConfirmDialog
      open={Boolean(client)}
      onOpenChange={onOpenChange}
      title="Remover cliente?"
      description={`Essa ação não poderá ser desfeita${client ? ` para "${client.name}"` : ''}.`}
      confirmLabel="Remover"
      onConfirm={handleConfirm}
      isLoading={deleteClient.isPending}
    >
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 text-body-strong text-text-primary">Tarefas vinculadas a este cliente</legend>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-input border border-border p-3 has-[:checked]:border-sage-green has-[:checked]:bg-tea-green/30">
          <input
            type="radio"
            name="tasksAction"
            className="mt-1"
            checked={tasksAction === 'unlink'}
            onChange={() => setTasksAction('unlink')}
          />
          <span>
            <span className="block text-body-strong text-text-primary">Manter tarefas sem vínculo</span>
            <span className="block text-caption text-text-secondary">As tarefas continuam existindo, sem cliente associado.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-input border border-border p-3 has-[:checked]:border-danger has-[:checked]:bg-danger/5">
          <input
            type="radio"
            name="tasksAction"
            className="mt-1"
            checked={tasksAction === 'delete'}
            onChange={() => setTasksAction('delete')}
          />
          <span>
            <span className="block text-body-strong text-text-primary">Remover tarefas relacionadas</span>
            <span className="block text-caption text-text-secondary">Todas as tarefas deste cliente serão excluídas.</span>
          </span>
        </label>
      </fieldset>
    </ConfirmDialog>
  );
}
