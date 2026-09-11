import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { IconButton } from '@/components/ui/IconButton';
import { ActionsMenu } from '@/components/ui/ActionsMenu';
import { Checkbox } from '@/components/ui/Checkbox';
import { ReminderBell } from './ReminderBell';
import { TaskWithClient } from '@/types';
import { formatCompletedRetention, formatTaskDue, isOverdue } from '@/utils/formatters';

interface TaskTableProps {
  tasks: TaskWithClient[];
  onToggleComplete: (task: TaskWithClient) => void;
  onEdit: (task: TaskWithClient) => void;
  onDelete: (task: TaskWithClient) => void;
}

/**
 * Desktop list. Title, client and priority share the first cell and the
 * rarer actions sit in a menu, so the row fits a 1024px laptop with the
 * sidebar open instead of scrolling the buttons out of sight.
 */
export function TaskTable({ tasks, onToggleComplete, onEdit, onDelete }: TaskTableProps) {
  const navigate = useNavigate();

  return (
    <Table>
      <Thead>
        <Tr>
          <Th className="w-12" aria-label="Concluída" />
          <Th>Tarefa</Th>
          <Th>Prazo</Th>
          <Th>Situação</Th>
          <Th className="w-[136px] text-right">Ações</Th>
        </Tr>
      </Thead>
      <Tbody>
        {tasks.map((task) => {
          const client = task.client;
          const overdue = isOverdue(task.dueDate, task.status);
          const retention = formatCompletedRetention(task);
          const done = task.status === 'completed';

          return (
            <Tr key={task.id} className="cursor-pointer" onClick={() => navigate(`/tarefas/${task.id}`)}>
              <Td onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={done}
                  onCheckedChange={() => onToggleComplete(task)}
                  label={`Marcar "${task.title}" como concluída`}
                  hideLabel
                />
              </Td>
              <Td>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 whitespace-nowrap">
                    <PriorityFlag priority={task.priority} size={14} />
                    <span
                      className={`max-w-[320px] truncate text-body-strong ${
                        done ? 'text-text-secondary line-through' : 'text-text-primary'
                      }`}
                    >
                      {task.title}
                    </span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-caption text-text-secondary">
                    {client ? (
                      <>
                        <Avatar name={client.name} initials={client.initials} src={client.avatarUrl} size="sm" />
                        <span className="max-w-[240px] truncate">{client.name}</span>
                      </>
                    ) : (
                      'Sem cliente'
                    )}
                  </p>
                </div>
              </Td>
              <Td>
                {task.dueDate ? (
                  overdue ? (
                    <Badge tone="danger">Atrasada</Badge>
                  ) : (
                    <span className="whitespace-nowrap">{formatTaskDue(task.dueDate)}</span>
                  )
                ) : (
                  <span className="text-text-secondary">—</span>
                )}
              </Td>
              <Td>
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge status={task.status} />
                  {retention && <span className="whitespace-nowrap text-caption text-text-secondary">{retention}</span>}
                </div>
              </Td>
              <Td onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-0.5">
                  <ReminderBell task={task} />
                  <IconButton icon={<Pencil size={16} />} label="Editar" onClick={() => onEdit(task)} />
                  <ActionsMenu
                    items={[
                      { label: 'Ver detalhes', icon: <Eye size={16} />, onSelect: () => navigate(`/tarefas/${task.id}`) },
                      {
                        label: 'Remover',
                        icon: <Trash2 size={16} />,
                        onSelect: () => onDelete(task),
                        danger: true,
                        separatorBefore: true,
                      },
                    ]}
                  />
                </div>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}
