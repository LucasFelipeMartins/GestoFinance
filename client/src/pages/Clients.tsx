import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
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
import { ClientTable } from '@/components/clients/ClientTable';
import { ClientCardMobile } from '@/components/clients/ClientCardMobile';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { DeleteClientDialog } from '@/components/clients/DeleteClientDialog';
import { useClients, useUpdateClientStatus } from '@/hooks/useClients';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { STATUS_OPTIONS, PRIORITY_OPTIONS, Client, EntityStatus, Priority } from '@/types';
import { formatCurrency } from '@/utils/formatters';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Mais recentes' },
  { value: 'name', label: 'Nome' },
  { value: 'price', label: 'Preço' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'deliveryDate', label: 'Data de entrega' },
  { value: 'status', label: 'Situação' },
];

export default function Clients() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EntityStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [sort, setSort] = useState<'name' | 'price' | 'priority' | 'createdAt' | 'status' | 'deliveryDate'>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const toast = useToast();
  const updateStatus = useUpdateClientStatus();

  const { data: clients, isLoading } = useClients({
    search: debouncedSearch || undefined,
    status: status || undefined,
    priority: priority || undefined,
    sort,
    order,
  });

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingClient(undefined);
      setFormOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasFilters = Boolean(search || status || priority);
  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
  };

  const openAdd = () => {
    setEditingClient(undefined);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleComplete = async (client: Client) => {
    try {
      await updateStatus.mutateAsync({ id: client.id, status: 'completed' });
      toast.success(
        client.price > 0
          ? `Cliente concluído. ${formatCurrency(client.price)} entrou nas receitas.`
          : 'Cliente concluído.'
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Clientes"
        subtitle="Sua carteira de clientes, com prioridade, prazo de entrega e situação de cada um."
        action={
          <Button leftIcon={<Plus size={18} />} onClick={openAdd}>
            Adicionar cliente
          </Button>
        }
      />

      <FilterBar>
        <FilterSearch value={search} onChange={setSearch} placeholder="Buscar por nome, telefone ou serviço" />
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
        <SortControl
          options={SORT_OPTIONS}
          value={sort}
          onChange={(v) => setSort(v as typeof sort)}
          order={order}
          onToggleOrder={() => setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
        />
        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
      </FilterBar>

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : !clients || clients.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={<Users size={26} />}
            title="Nenhum cliente encontrado"
            description="Ajuste os filtros ou a busca para encontrar o que procura."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Users size={26} />}
            title="Nenhum cliente cadastrado"
            description="Adicione seu primeiro cliente para começar."
            action={
              <Button leftIcon={<Plus size={18} />} onClick={openAdd}>
                Adicionar cliente
              </Button>
            }
          />
        )
      ) : (
        <>
          <div className="hidden xl:block">
            <ClientTable clients={clients} onEdit={openEdit} onComplete={handleComplete} onDelete={setDeletingClient} />
          </div>
          <div className="flex flex-col gap-3 xl:hidden">
            {clients.map((client) => (
              <ClientCardMobile key={client.id} client={client} onEdit={openEdit} onComplete={handleComplete} onDelete={setDeletingClient} />
            ))}
          </div>
        </>
      )}

      <ClientFormModal open={formOpen} onOpenChange={setFormOpen} client={editingClient} />
      <DeleteClientDialog client={deletingClient} onOpenChange={(open) => !open && setDeletingClient(null)} />
    </PageContainer>
  );
}
