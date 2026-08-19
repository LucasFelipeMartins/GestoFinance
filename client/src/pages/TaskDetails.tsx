import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Clock, FileText, Pencil, CheckCircle, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { PriorityFlag } from '@/components/ui/PriorityFlag';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';
import { DeleteTaskDialog } from '@/components/tasks/DeleteTaskDialog';
import { useTask, useUpdateTaskStatus } from '@/hooks/useTasks';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { formatDate, isOverdue } from '@/utils/formatters';

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tea-green/50 text-sage-green">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-caption text-text-secondary">{label}</p>
        <p className="truncate text-body-strong text-text-primary">{value}</p>
      </div>
    </div>
  );
}

export default function TaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading } = useTask(id);
  const updateStatus = useUpdateTaskStatus();
  const toast = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleComplete = async () => {
    if (!task) return;
    try {
      await updateStatus.mutateAsync({ id: task.id, status: 'completed' });
      toast.success('Tarefa concluída.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-9 w-40" />
        <Card className="flex flex-col items-center gap-3 py-10">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </Card>
      </PageContainer>
    );
  }

  if (!task) {
    return (
      <PageContainer>
        <p className="text-body text-text-secondary">Tarefa não encontrada.</p>
      </PageContainer>
    );
  }

  const client = task.client;
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <PageContainer>
      <button
        type="button"
        onClick={() => navigate('/tarefas')}
        className="inline-flex w-fit items-center gap-1.5 text-body-strong text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={18} />
        Voltar
      </button>

      <Card className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tea-green/50">
            <PriorityFlag priority={task.priority} size={26} />
          </span>
          <div>
            <h1 className="text-h2 text-text-primary">{task.title}</h1>
            {client && <p className="text-body text-text-secondary">{client.name}</p>}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityFlag priority={task.priority} />
            {overdue && <Badge tone="danger">Vencida</Badge>}
          </div>
        </div>

        <div className="mt-6 divide-y divide-border border-y border-border">
          {client && (
            <DetailRow
              icon={<Avatar name={client.name} initials={client.initials} src={client.avatarUrl} size="sm" />}
              label="Cliente"
              value={client.name}
            />
          )}
          {!client && <DetailRow icon={<User size={17} />} label="Cliente" value="Sem cliente relacionado" />}
          <DetailRow icon={<Calendar size={17} />} label="Prazo" value={task.dueDate ? formatDate(task.dueDate) : 'Sem prazo definido'} />
          {task.description && <DetailRow icon={<FileText size={17} />} label="Descrição" value={task.description} />}
          <DetailRow icon={<Calendar size={17} />} label="Criada em" value={formatDate(task.createdAt)} />
          <DetailRow icon={<Clock size={17} />} label="Última atualização" value={formatDate(task.updatedAt)} />
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Button leftIcon={<Pencil size={18} />} variant="secondary" onClick={() => setEditOpen(true)}>
            Editar
          </Button>
          <Button
            leftIcon={<CheckCircle size={18} />}
            onClick={handleComplete}
            disabled={task.status === 'completed'}
            isLoading={updateStatus.isPending}
          >
            Marcar como concluída
          </Button>
          <Button leftIcon={<Trash2 size={18} />} variant="danger" onClick={() => setDeleteOpen(true)}>
            Remover Tarefa
          </Button>
        </div>
      </Card>

      <TaskFormModal open={editOpen} onOpenChange={setEditOpen} task={task} />
      <DeleteTaskDialog
        task={deleteOpen ? task : null}
        onOpenChange={(open) => setDeleteOpen(open)}
        onDeleted={() => navigate('/tarefas')}
      />
    </PageContainer>
  );
}
