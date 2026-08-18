import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { Badge } from '@/components/ui/Badge';
import { ActionsMenu } from '@/components/ui/ActionsMenu';
import { Task } from '@/types';
import { formatRelativeDate, isOverdue } from '@/utils/formatters';

interface TaskCardMobileProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskCardMobile({ task, onToggleComplete, onEdit, onDelete }: TaskCardMobileProps) {
  const navigate = useNavigate();
  const client = typeof task.clientId === 'object' ? task.clientId : undefined;
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <Card className="flex flex-col gap-2.5 cursor-pointer" onClick={() => navigate(`/tarefas/${task._id}`)}>
      <div className="flex items-start gap-3">
        <PriorityFlag priority={task.priority} size={18} />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-body-strong ${task.status === 'completed' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
            {task.title}
          </p>
          <p className="truncate text-caption text-text-secondary">{client ? client.name : 'Sem cliente'}</p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={task.status === 'completed'}
            onCheckedChange={() => onToggleComplete(task)}
            label={`Marcar "${task.title}" como concluída`}
            hideLabel
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {task.dueDate ? (
          overdue ? (
            <Badge tone="danger">Vencida</Badge>
          ) : (
            <span className="text-caption text-text-secondary">{formatRelativeDate(task.dueDate)}</span>
          )
        ) : (
          <span className="text-caption text-text-secondary">Sem prazo</span>
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <ActionsMenu
            items={[
              { label: 'Visualizar', icon: <Eye size={16} />, onSelect: () => navigate(`/tarefas/${task._id}`) },
              { label: 'Editar', icon: <Pencil size={16} />, onSelect: () => onEdit(task) },
              { label: 'Remover', icon: <Trash2 size={16} />, onSelect: () => onDelete(task), danger: true, separatorBefore: true },
            ]}
          />
        </div>
      </div>
    </Card>
  );
}
