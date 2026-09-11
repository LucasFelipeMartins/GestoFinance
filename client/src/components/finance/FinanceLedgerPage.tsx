import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Wallet } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { StatGrid, StatTile } from '@/components/ui/StatTile';
import {
  FilterBar,
  FilterSearch,
  FilterSelect,
  SortControl,
  ClearFiltersButton,
} from '@/components/ui/FilterBar';
import { useFinanceEntries, usePayInstallment, useSetFinancePaid, useUndoInstallment } from '@/hooks/useFinance';
import { useClients } from '@/hooks/useClients';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { FinanceEntry, FinanceKind } from '@/types';
import { FINANCE_META } from '@/utils/financeMeta';
import { isInstallmentPlan, nextInstallment } from '@/utils/finance';
import { FinanceEntryTable } from './FinanceEntryTable';
import { FinanceEntryCard } from './FinanceEntryCard';
import { FinanceFormModal } from './FinanceFormModal';
import { DeleteFinanceDialog } from './DeleteFinanceDialog';

export interface LedgerStat {
  label: string;
  value: string;
  caption?: string;
  /** Draws attention (used for atrasadas). */
  attention?: boolean;
  icon?: ReactNode;
}

const SORT_OPTIONS = [
  { value: 'date', label: 'Data' },
  { value: 'amount', label: 'Valor' },
  { value: 'description', label: 'Nome' },
  { value: 'createdAt', label: 'Mais recentes' },
];

const PAID_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: 'A pagar' },
  { value: 'paid', label: 'Pagas' },
];

interface FinanceLedgerPageProps {
  kind: FinanceKind;
  title: string;
  subtitle: string;
  /** Computed from the loaded entries — rendered as the stat strip. */
  stats: (entries: FinanceEntry[]) => LedgerStat[];
  /** Extra content between the stats and the list (the simulator). */
  children?: ReactNode;
  onSimulate?: (entry: FinanceEntry) => void;
  emptyDescription: string;
}

/**
 * The shared shell behind Receitas, Despesas and Investimentos. The three
 * pages are the same ledger filtered by `kind`, so they share one
 * implementation and differ only in their stats, copy and extras.
 */
export function FinanceLedgerPage({
  kind,
  title,
  subtitle,
  stats,
  children,
  onSimulate,
  emptyDescription,
}: FinanceLedgerPageProps) {
  const meta = FINANCE_META[kind];
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [paidFilter, setPaidFilter] = useState('all');
  const [sort, setSort] = useState<'date' | 'amount' | 'description' | 'createdAt'>('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | undefined>();
  const [deleting, setDeleting] = useState<FinanceEntry | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const toast = useToast();
  const setPaid = useSetFinancePaid();
  const payInstallment = usePayInstallment();
  const undoInstallment = useUndoInstallment();
  const { data: clients } = useClients();

  const { data: entries, isLoading } = useFinanceEntries({
    kind,
    search: debouncedSearch || undefined,
    paid: paidFilter === 'all' ? undefined : paidFilter === 'paid',
    sort,
    order,
  });

  // Unfiltered, so the stat strip keeps reporting the whole ledger while the
  // list below is narrowed down.
  const { data: allEntries } = useFinanceEntries({ kind });

  const clientNameById = useMemo(() => {
    const map = new Map((clients ?? []).map((client) => [client.id, client.name]));
    return (clientId: string) => map.get(clientId);
  }, [clients]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing(undefined);
      setFormOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasFilters = Boolean(search || paidFilter !== 'all');
  const clearFilters = () => {
    setSearch('');
    setPaidFilter('all');
  };

  const openAdd = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  /** Pix / à vista flips paid; a parcelado settles its next parcela (or,
   * when everything is already in, reopens the last one). */
  const handleTogglePaid = async (entry: FinanceEntry) => {
    try {
      if (isInstallmentPlan(entry)) {
        if (entry.paid) {
          await undoInstallment.mutateAsync(entry.id);
          toast.success('Última parcela reaberta.');
          return;
        }
        const next = nextInstallment(entry);
        await payInstallment.mutateAsync(entry.id);
        const last = next ? next.number >= next.total : true;
        toast.success(
          last ? 'Última parcela paga — despesa quitada.' : `Parcela ${next?.number} marcada como paga.`
        );
        return;
      }
      await setPaid.mutateAsync({ id: entry.id, paid: !entry.paid });
      toast.success(entry.paid ? 'Despesa reaberta.' : 'Despesa marcada como paga.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível atualizar a despesa.'));
    }
  };

  const handleUndoInstallment = async (entry: FinanceEntry) => {
    try {
      await undoInstallment.mutateAsync(entry.id);
      toast.success('Parcela reaberta.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível reabrir a parcela.'));
    }
  };

  const listProps = {
    kind,
    onEdit: (entry: FinanceEntry) => {
      setEditing(entry);
      setFormOpen(true);
    },
    onDelete: setDeleting,
    onTogglePaid: kind === 'expense' ? handleTogglePaid : undefined,
    onUndoInstallment: kind === 'expense' ? handleUndoInstallment : undefined,
    onSimulate,
    onOpenClient: (clientId: string) => navigate(`/clientes/${clientId}`),
    clientName: clientNameById,
  };

  const addLabel = `Adicionar ${meta.label.toLowerCase()}`;

  return (
    <PageContainer>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button leftIcon={<Plus size={18} />} onClick={openAdd}>
            {addLabel}
          </Button>
        }
      />

      <StatGrid columns={3}>
        {stats(allEntries ?? []).map((stat) => (
          <StatTile
            key={stat.label}
            label={stat.label}
            value={stat.value}
            caption={stat.caption}
            attention={stat.attention}
            icon={stat.icon}
            color={stat.icon ? meta.color : undefined}
            soft={stat.icon ? meta.soft : undefined}
            accent={stat.icon ? undefined : meta.color}
          />
        ))}
      </StatGrid>

      {children}

      <FilterBar>
        <FilterSearch value={search} onChange={setSearch} placeholder="Buscar por nome, categoria ou observação" />

        {kind === 'expense' && (
          <FilterSelect options={PAID_OPTIONS} value={paidFilter} onChange={setPaidFilter} placeholder="Situação" />
        )}

        <SortControl
          options={SORT_OPTIONS}
          value={sort}
          onChange={(value) => setSort(value as typeof sort)}
          order={order}
          onToggleOrder={() => setOrder((current) => (current === 'asc' ? 'desc' : 'asc'))}
        />

        {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
      </FilterBar>

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : !entries || entries.length === 0 ? (
        <EmptyState
          icon={<Wallet size={26} />}
          title={hasFilters ? 'Nada encontrado' : `Nenhum registro em ${title.toLowerCase()}`}
          description={hasFilters ? 'Ajuste os filtros ou a busca para encontrar o que procura.' : emptyDescription}
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Limpar filtros
              </Button>
            ) : (
              <Button leftIcon={<Plus size={18} />} onClick={openAdd}>
                {addLabel}
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="hidden lg:block">
            <FinanceEntryTable entries={entries} {...listProps} />
          </div>
          <div className="flex flex-col gap-3 lg:hidden">
            {entries.map((entry) => (
              <FinanceEntryCard key={entry.id} entry={entry} {...listProps} />
            ))}
          </div>
        </>
      )}

      <FinanceFormModal open={formOpen} onOpenChange={setFormOpen} entry={editing} lockedKind={kind} />
      <DeleteFinanceDialog entry={deleting} onOpenChange={(open) => !open && setDeleting(null)} />
    </PageContainer>
  );
}
