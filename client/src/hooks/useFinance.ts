import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeRepository, FinanceFormInput } from '@/repositories/financeRepository';
import { FinanceListParams } from '@/services/financeService';
import { FinanceEntry } from '@/types';
import {
  buildMonthlySeries,
  summarizeBills,
  totalsForMonth,
  BillsSummary,
  FinanceTotals,
  MonthBucket,
} from '@/utils/finance';

export const financeKey = (params: FinanceListParams = {}) => ['finance', params] as const;
export const financeEntryKey = (id: string) => ['finance', 'detail', id] as const;

export function useFinanceEntries(params: FinanceListParams = {}) {
  return useQuery({
    queryKey: financeKey(params),
    queryFn: () => financeRepository.list(params),
  });
}

export function useFinanceEntry(id: string | undefined) {
  return useQuery({
    queryKey: financeEntryKey(id ?? ''),
    queryFn: () => financeRepository.get(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateFinance() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['finance'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useCreateFinanceEntry() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (payload: FinanceFormInput) => financeRepository.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateFinanceEntry() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<FinanceFormInput> }) =>
      financeRepository.update(id, payload),
    onSuccess: invalidate,
  });
}

/** The "já foi pago" toggle on a conta a pagar. */
export function useSetFinancePaid() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) => financeRepository.setPaid(id, paid),
    onSuccess: invalidate,
  });
}

export function useDeleteFinanceEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeRepository.remove(id),
    onSuccess: (_data, id) => {
      // Same reasoning as useDeleteTask: skip the just-deleted entry's own
      // detail query so nothing refetches it and gets undefined back.
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [root, ...rest] = query.queryKey as [string, ...unknown[]];
          if (root !== 'finance') return false;
          return !(rest[0] === 'detail' && rest[1] === id);
        },
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export interface FinanceOverview {
  entries: FinanceEntry[];
  /** One bucket per month, oldest first — what the Home chart plots. */
  series: MonthBucket[];
  /** Current-month figures, for the panel above the chart. */
  totals: FinanceTotals;
  bills: BillsSummary;
  /** Unpaid despesas, soonest due date first. */
  openBills: FinanceEntry[];
}

/**
 * Everything the Home financial panel needs, derived from a single read of
 * the local ledger. Reading once and deriving keeps the panel, the chart and
 * the contas-a-pagar list from ever disagreeing with each other.
 */
export function useFinanceOverview(months = 5) {
  const query = useFinanceEntries();

  const overview = useMemo<FinanceOverview>(() => {
    const entries = query.data ?? [];
    return {
      entries,
      series: buildMonthlySeries(entries, months),
      totals: totalsForMonth(entries),
      bills: summarizeBills(entries),
      openBills: entries
        .filter((entry) => entry.kind === 'expense' && !entry.paid)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    };
  }, [query.data, months]);

  return { ...query, overview };
}
