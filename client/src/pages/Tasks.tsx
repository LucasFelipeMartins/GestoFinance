import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ListChecks } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  FilterBar,
  FilterSearch,
  FilterGroup,
  FilterSelect,
  SortControl,
  ClearFiltersButton,
} from '@/components/ui/FilterBar';
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
  { value: 'status', label: 'Situação' },
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
      toast.success(task.status === 'completed' ? 'Tarefa reaberta.' : 'Tarefa concluída. Será removida em 24h.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Tarefas"
        subtitle="O que precisa ser feito e até quando. Tarefas concluídas ficam aqui por 24h e depois somem sozinhas."
        action={
          <Button leftIcon={<Plus size={18} />} onClick={openAdd}>
            Adicionar tarefa
          </Button>
        }
      />

      <FilterBar>
        <FilterSearch value={search} onChange={setSearch} placeholder="Buscar por título, descrição ou cliente" />
        <FilterGroup>
          <FilterSelect
            placeholder="Situação"
            options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
            value={status}
            onChange={(v) => setStatus(v as EntityStatus)}
          />
          <FilterSelect
            placeholder="Prioridade"
            options={PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
            value={priority}
            onChange={(v) => setPriority(v as Priority)}
          />
        </FilterGroup>
        <FilterSelect
          placeholder="Cliente"
          options={(clients ?? []).map((c) => ({ value: c.id, label: c.name }))}
          value={clientId}
          onChange={setClientId}
        />
        <SortControl
          options={SORT_OPTIONS}
          value={sort}
          onChange={(v) => setSort(v as typeof sort)}
          order={order}
          onToggleOrder={sort !== 'default' ? () => setOrder((o) => (o === 'asc' ? 'desc' : 'asc')) : undefined}
        />
        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
      </FilterBar>

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
                Adicionar tarefa
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
