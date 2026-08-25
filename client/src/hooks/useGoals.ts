import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalRepository, GoalFormInput } from '@/repositories/goalRepository';

export const goalsKey = ['goals'] as const;
export const goalKey = (id: string) => ['goals', 'detail', id] as const;

export function useGoals() {
  return useQuery({
    queryKey: goalsKey,
    queryFn: () => goalRepository.list(),
  });
}

export function useGoal(id: string | undefined) {
  return useQuery({
    queryKey: goalKey(id ?? ''),
    queryFn: () => goalRepository.get(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateGoals() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useCreateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (payload: GoalFormInput) => goalRepository.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: GoalFormInput }) =>
      goalRepository.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalRepository.remove(id),
    onSuccess: (_data, id) => {
      // Same reasoning as useDeleteTask: skip the just-deleted goal's own
      // detail query so nothing refetches it and gets undefined back.
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [root, ...rest] = query.queryKey as [string, ...unknown[]];
          if (root !== 'goals') return false;
          return !(rest[0] === 'detail' && rest[1] === id);
        },
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Adding money is the whole point of a meta — each call appends a record. */
export function useAddContribution() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({
      goalId,
      amount,
      date,
      note,
    }: {
      goalId: string;
      amount: number;
      date?: string;
      note?: string;
    }) => goalRepository.addContribution(goalId, amount, { date, note }),
    onSuccess: invalidate,
  });
}

export function useDeleteContribution() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (id: string) => goalRepository.removeContribution(id),
    onSuccess: invalidate,
  });
}
