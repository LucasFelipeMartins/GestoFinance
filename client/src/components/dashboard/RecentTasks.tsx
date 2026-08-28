import { useNavigate } from 'react-router-dom';
import { ListChecks, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { ReminderBell } from '@/components/tasks/ReminderBell';
import { useUpdateTaskStatus } from '@/hooks/useTasks';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { TaskWithClient } from '@/types';
import { formatTaskDue, isOverdue } from '@/utils/formatters';

/**
 * The open half of the workload. Home only ever gets tasks that are still
 * pending or in progress (see dashboardRepository) — checking one off makes
 * it leave this list at once and finish its last 24h on the Tarefas page.
 */
export function RecentTasks({ tasks }: { tasks: TaskWithClient[] }) {
  const navigate = useNavigate();
  const updateStatus = useUpdateTaskStatus();
  const toast = useToast();

  const handleComplete = async (task: TaskWithClient) => {
    try {
      await updateStatus.mutateAsync({ id: task.id, status: 'completed' });
      toast.success('Tarefa concluída. Ela fica em Tarefas por 24h.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-h3 text-text-primary">
          <ListChecks size={19} className="text-sage-green" />
          Tarefas Pendentes
        </h3>
        <button
          type="button"
          onClick={() => navigate('/tarefas')}
          className="inline-flex items-center gap-1 text-body-strong text-sage-green hover:underline"
        >
          Ver todas
          <ArrowRight size={15} />
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="mt-6 text-body text-text-secondary">Nenhuma tarefa pendente. Tudo em dia!</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {tasks.map((task) => {
            const client = task.client;
            const overdue = isOverdue(task.dueDate, task.status);
            return (
              <li key={task.id} className="flex items-center gap-3 py-3">
                <Checkbox
                  checked={false}
                  onCheckedChange={() => handleComplete(task)}
                  label={`Marcar "${task.title}" como concluída`}
                  hideLabel
                />
                <button
                  type="button"
                  onClick={() => navigate(`/tarefas/${task.id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-body-strong text-text-primary">{task.title}</p>
                  <p className="truncate text-caption text-text-secondary">{client?.name ?? 'Sem cliente'}</p>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {overdue ? (
                    <Badge tone="danger">Vencida</Badge>
                  ) : task.dueDate ? (
                    <span className="text-caption text-text-secondary">{formatTaskDue(task.dueDate)}</span>
                  ) : null}
                  <StatusBadge status={task.status} />
                </div>
                <PriorityFlag priority={task.priority} />
                <div onClick={(e) => e.stopPropagation()}>
                  <ReminderBell task={task} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
