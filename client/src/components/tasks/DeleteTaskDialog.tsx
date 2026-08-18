import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDeleteTask } from '@/hooks/useTasks';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { Task } from '@/types';

interface DeleteTaskDialogProps {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteTaskDialog({ task, onOpenChange, onDeleted }: DeleteTaskDialogProps) {
  const deleteTask = useDeleteTask();
  const toast = useToast();

  const handleConfirm = async () => {
    if (!task) return;
    try {
      await deleteTask.mutateAsync(task._id);
      toast.success('Tarefa removida.');
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível remover a tarefa.'));
    }
  };

  return (
    <ConfirmDialog
      open={Boolean(task)}
      onOpenChange={onOpenChange}
      title="Remover tarefa?"
      description={`Essa ação não poderá ser desfeita${task ? ` para "${task.title}"` : ''}.`}
      confirmLabel="Remover"
      onConfirm={handleConfirm}
      isLoading={deleteTask.isPending}
    />
  );
}
