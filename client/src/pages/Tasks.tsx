import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ListChecks, X, ArrowUpDown } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { TaskTable } from '@/components/tasks/TaskTable';
import { TaskCardMobile } from '@/components/tasks/TaskCardMobile';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';
import { DeleteTaskDialog } from '@/components/tasks/DeleteTaskDialog';
import { useTasks, useUpdateTaskStatus } from '@/hooks/useTasks';
import { useClients } from '@/hooks/useClients';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { STATUS_OPTIONS, PRIORITY_OPTIONS, Task, EntityStatus, Priority } from '@/types';

const SORT_OPTIONS = [
  { value: 'default', label: 'Padrão' },
  { value: 'dueDate', label: 'Prazo' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'createdAt', label: 'Mais recentes' },
  { value: 'status', label: 'Status' },
];

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EntityStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [clientId, setClientId] = useState<string>('');
  const [sort, setSort] = useState<'default' | 'dueDate' | 'priority' | 'createdAt' | 'status'>('default');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const toast = useToast();
  const updateStatus = useUpdateTaskStatus();
  const { data: clients } = useClients();

  const { data: tasks, isLoading } = useTasks({
    search: debouncedSearch || undefined,
    status: status || undefined,
    priority: priority || undefined,
    clientId: clientId || undefined,
    sort: sort === 'default' ? undefined : sort,
    order: sort === 'default' ? undefined : order,
  });

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingTask(undefined);
      setFormOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasFilters = Boolean(search || status || priority || clientId);
  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setClientId('');
  };

  const openAdd = () => {
    setEditingTask(undefined);
    setFormOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      await updateStatus.mutateAsync({ id: task.id, status: task.status === 'completed' ? 'pending' : 'completed' });
      toast.success(task.status === 'completed' ? 'Tarefa reaberta.' : 'Tarefa concluída.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Tarefas"
        subtitle="Acompanhe o que precisa ser feito e os prazos."
        action={
          <Button leftIcon={<Plus size={18} />} onClick={openAdd} className="shrink-0">
            Adicionar Tarefa
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por título, descrição ou cliente" className="sm:max-w-xs sm:flex-1" />
        <div className="grid grid-cols-2 gap-3 sm:flex sm:w-auto">
          <Select
            placeholder="Status"
            options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
            value={status}
            onChange={(v) => setStatus(v as EntityStatus)}
          />
          <Select
            placeholder="Prioridade"
            options={PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
            value={priority}
            onChange={(v) => setPriority(v as Priority)}
          />
        </div>
        <Select
          placeholder="Cliente"
          options={(clients ?? []).map((c) => ({ value: c.id, label: c.name }))}
          value={clientId}
          onChange={setClientId}
        />
        <div className="flex items-center gap-2">
          <Select options={SORT_OPTIONS} value={sort} onChange={(v) => setSort(v as typeof sort)} placeholder="Ordenar" />
          {sort !== 'default' && (
            <button
              type="button"
              onClick={() => setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              aria-label={order === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input border border-border bg-white text-text-secondary hover:border-sage-green/60"
            >
              <ArrowUpDown size={17} className={order === 'asc' ? 'rotate-180' : ''} />
            </button>
          )}
        </div>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-body-strong text-sage-green hover:underline">
            <X size={15} />
            Limpar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : !tasks || tasks.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={<ListChecks size={26} />}
            title="Nenhuma tarefa encontrada"
            description="Ajuste os filtros ou a busca para encontrar o que procura."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<ListChecks size={26} />}
            title="Nenhuma tarefa encontrada"
            description="Crie uma nova tarefa para começar."
            action={
              <Button leftIcon={<Plus size={18} />} onClick={openAdd}>
                Adicionar Tarefa
              </Button>
            }
          />
        )
      ) : (
        <>
          <div className="hidden lg:block">
            <TaskTable tasks={tasks} onToggleComplete={handleToggleComplete} onEdit={openEdit} onDelete={setDeletingTask} />
          </div>
          <div className="flex flex-col gap-3 lg:hidden">
            {tasks.map((task) => (
              <TaskCardMobile key={task.id} task={task} onToggleComplete={handleToggleComplete} onEdit={openEdit} onDelete={setDeletingTask} />
            ))}
          </div>
        </>
      )}

      <TaskFormModal open={formOpen} onOpenChange={setFormOpen} task={editingTask} />
      <DeleteTaskDialog task={deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)} />
    </PageContainer>
  );
}
