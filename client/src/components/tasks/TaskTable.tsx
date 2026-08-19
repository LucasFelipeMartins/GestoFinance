import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { IconButton } from '@/components/ui/IconButton';
import { Checkbox } from '@/components/ui/Checkbox';
import { TaskWithClient } from '@/types';
import { formatRelativeDate, isOverdue } from '@/utils/formatters';

interface TaskTableProps {
  tasks: TaskWithClient[];
  onToggleComplete: (task: TaskWithClient) => void;
  onEdit: (task: TaskWithClient) => void;
  onDelete: (task: TaskWithClient) => void;
}

export function TaskTable({ tasks, onToggleComplete, onEdit, onDelete }: TaskTableProps) {
  const navigate = useNavigate();

  return (
    <Table>
      <Thead>
        <Tr>
          <Th className="w-12"></Th>
          <Th>Tarefa</Th>
          <Th>Cliente</Th>
          <Th>Prazo</Th>
          <Th>Prioridade</Th>
          <Th>Status</Th>
          <Th className="text-right">Ações</Th>
        </Tr>
      </Thead>
      <Tbody>
        {tasks.map((task) => {
          const client = task.client;
          const overdue = isOverdue(task.dueDate, task.status);

          return (
            <Tr key={task.id} className="cursor-pointer" onClick={() => navigate(`/tarefas/${task.id}`)}>
              <Td onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => onToggleComplete(task)}
                  label={`Marcar "${task.title}" como concluída`}
                  hideLabel
                />
              </Td>
              <Td className={`font-semibold ${task.status === 'completed' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                {task.title}
              </Td>
              <Td>
                {client ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={client.name} initials={client.initials} src={client.avatarUrl} size="sm" />
                    <span className="truncate">{client.name}</span>
                  </span>
                ) : (
                  <span className="text-text-secondary">Sem cliente</span>
                )}
              </Td>
              <Td>
                {task.dueDate ? (
                  overdue ? (
                    <Badge tone="danger">Vencida</Badge>
                  ) : (
                    <span className="whitespace-nowrap">{formatRelativeDate(task.dueDate)}</span>
                  )
                ) : (
                  <span className="text-text-secondary">—</span>
                )}
              </Td>
              <Td>
                <PriorityFlag priority={task.priority} />
              </Td>
              <Td>
                <StatusBadge status={task.status} />
              </Td>
              <Td onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1">
                  <IconButton icon={<Eye size={16} />} label="Visualizar" onClick={() => navigate(`/tarefas/${task.id}`)} />
                  <IconButton icon={<Pencil size={16} />} label="Editar" onClick={() => onEdit(task)} />
                  <IconButton icon={<Trash2 size={16} />} label="Remover" variant="danger" onClick={() => onDelete(task)} />
                </div>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}
