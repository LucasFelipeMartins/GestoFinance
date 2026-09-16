import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boxRepository, BoxFormInput } from '@/repositories/boxRepository';

export const boxesKey = ['boxes'] as const;

export function useBoxes() {
  return useQuery({ queryKey: boxesKey, queryFn: () => boxRepository.list() });
}

function useInvalidateBoxes() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['boxes'] });
    // Removing a pot rewrites its entries' boxId, which the ledger shows,
    // and unlinks any goal that mirrored it.
    queryClient.invalidateQueries({ queryKey: ['finance'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
  };
}

export function useCreateBox() {
  const invalidate = useInvalidateBoxes();
  return useMutation({
    mutationFn: (input: BoxFormInput) => boxRepository.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateBox() {
  const invalidate = useInvalidateBoxes();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BoxFormInput }) => boxRepository.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteBox() {
  const invalidate = useInvalidateBoxes();
  return useMutation({ mutationFn: (id: string) => boxRepository.remove(id), onSuccess: invalidate });
}
