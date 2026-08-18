import { Modal } from '@/components/ui/Modal';
import { TaskForm, TaskFormValues } from './TaskForm';
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { Task } from '@/types';

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  lockedClientId?: string;
}

function getClientId(task?: Task): string | undefined {
  if (!task?.clientId) return undefined;
  return typeof task.clientId === 'string' ? task.clientId : task.clientId._id;
}

function toDateInputValue(dueDate?: string): string {
  if (!dueDate) return '';
  return dueDate.slice(0, 10);
}

export function TaskFormModal({ open, onOpenChange, task, lockedClientId }: TaskFormModalProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const toast = useToast();

  const isEditing = Boolean(task);
  const isSubmitting = createTask.isPending || updateTask.isPending;

  const handleSubmit = async (values: TaskFormValues) => {
    const payload = {
      title: values.title,
      description: values.description || undefined,
      clientId: values.clientId || undefined,
      dueDate: values.dueDate || undefined,
      priority: values.priority,
      status: values.status,
    };

    try {
      if (isEditing && task) {
        await updateTask.mutateAsync({ id: task._id, payload });
      } else {
        await createTask.mutateAsync(payload);
      }
      toast.success(isEditing ? 'Tarefa atualizada com sucesso.' : 'Tarefa criada com sucesso.');
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar a tarefa.'));
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Editar Tarefa' : 'Adicionar Tarefa'}
      preventOutsideClose={isSubmitting}
    >
      <TaskForm
        key={task?._id ?? 'new'}
        defaultValues={
          task
            ? { ...task, clientId: getClientId(task), dueDate: toDateInputValue(task.dueDate), description: task.description ?? '' }
            : { clientId: lockedClientId }
        }
        lockedClientId={lockedClientId}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? 'Salvar Alterações' : 'Salvar Tarefa'}
      />
    </Modal>
  );
}
