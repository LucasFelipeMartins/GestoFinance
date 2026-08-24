import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, X, ArrowUpDown, Wallet } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useFinanceEntries, useSetFinancePaid } from '@/hooks/useFinance';
import { useClients } from '@/hooks/useClients';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { getApiErrorMessage } from '@/services/api';
import { FinanceEntry, FinanceKind } from '@/types';
import { FINANCE_META } from '@/utils/financeMeta';
import { FinanceEntryTable } from './FinanceEntryTable';
import { FinanceEntryCard } from './FinanceEntryCard';
import { FinanceFormModal } from './FinanceFormModal';
import { DeleteFinanceDialog } from './DeleteFinanceDialog';

export interface LedgerStat {
  label: string;
  value: string;
  caption?: string;
  /** Draws attention (used for vencidas). */
  attention?: boolean;
}

const SORT_OPTIONS = [
  { value: 'date', label: 'Data' },
  { value: 'amount', label: 'Valor' },
  { value: 'description', label: 'Descrição' },
  { value: 'createdAt', label: 'Mais recentes' },
];

const PAID_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: 'Em aberto' },
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

function StatStrip({ stats, accent }: { stats: LedgerStat[]; accent: string }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-card border border-border bg-white p-4 shadow-card">
          <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
            {stat.label}
          </p>
          <p
            className="mt-1.5 text-h2 tabular-nums"
            style={{ color: stat.attention ? '#C23131' : undefined }}
          >
            {stat.value}
          </p>
          {stat.caption && (
            <p className="mt-0.5 text-caption text-text-secondary">{stat.caption}</p>
          )}
          <span className="mt-3 block h-0.5 w-9 rounded-full" style={{ backgroundColor: accent }} />
        </div>
      ))}
    </div>
  );
}

/**
 * The shared shell behind Lucros, Despesas and Investimentos. The three pages
 * are the same ledger filtered by `kind`, so they share one implementation
 * and differ only in their stats, copy and extras.
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

  const handleTogglePaid = async (entry: FinanceEntry) => {
    try {
      await setPaid.mutateAsync({ id: entry.id, paid: !entry.paid });
      toast.success(entry.paid ? 'Conta reaberta.' : 'Conta marcada como paga.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível atualizar a conta.'));
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
    onSimulate,
    onOpenClient: (clientId: string) => navigate(`/clientes/${clientId}`),
    clientName: clientNameById,
  };

  return (
    <PageContainer>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button leftIcon={<Plus size={18} />} onClick={openAdd} className="shrink-0">
            Adicionar {meta.label.toLowerCase()}
          </Button>
        }
      />

      <StatStrip stats={stats(allEntries ?? [])} accent={meta.color} />

      {children}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por descrição, categoria ou observação"
          className="sm:max-w-sm sm:flex-1"
        />

        {kind === 'expense' && (
          <div className="sm:w-40">
            <Select options={PAID_OPTIONS} value={paidFilter} onChange={setPaidFilter} />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Select
            options={SORT_OPTIONS}
            value={sort}
            onChange={(value) => setSort(value as typeof sort)}
            placeholder="Ordenar"
          />
          <button
            type="button"
            onClick={() => setOrder((current) => (current === 'asc' ? 'desc' : 'asc'))}
            aria-label={order === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input border border-border bg-white text-text-secondary transition-colors hover:border-sage-green/60"
          >
            <ArrowUpDown size={17} className={order === 'asc' ? 'rotate-180' : ''} />
          </button>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-body-strong text-sage-green hover:underline"
          >
            <X size={15} />
            Limpar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : !entries || entries.length === 0 ? (
        <EmptyState
          icon={<Wallet size={26} />}
          title={hasFilters ? 'Nenhum lançamento encontrado' : `Nenhum registro em ${title.toLowerCase()}`}
          description={hasFilters ? 'Ajuste os filtros ou a busca para encontrar o que procura.' : emptyDescription}
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Limpar filtros
              </Button>
            ) : (
              <Button leftIcon={<Plus size={18} />} onClick={openAdd}>
                Adicionar {meta.label.toLowerCase()}
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
