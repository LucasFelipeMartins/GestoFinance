import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientRepository, ClientFormInput } from '@/repositories/clientRepository';
import { clientService, ClientListParams } from '@/services/clientService';
import { EntityStatus } from '@/types';

export const clientsKey = (params: ClientListParams = {}) => ['clients', params] as const;
export const clientKey = (id: string) => ['clients', 'detail', id] as const;

export function useClients(params: ClientListParams = {}) {
  return useQuery({
    queryKey: clientsKey(params),
    queryFn: () => clientRepository.list(params),
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: clientKey(id ?? ''),
    queryFn: () => clientRepository.get(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateClients() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    // A concluded client is a lucro (financeRepository derives it), and its
    // price and status both feed that — so any client change can move the
    // financial numbers.
    queryClient.invalidateQueries({ queryKey: ['finance'] });
  };
}

export function useCreateClient() {
  const invalidate = useInvalidateClients();
  return useMutation({
    mutationFn: (payload: ClientFormInput) => clientRepository.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateClient() {
  const invalidate = useInvalidateClients();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ClientFormInput> }) =>
      clientRepository.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateClientStatus() {
  const invalidate = useInvalidateClients();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EntityStatus }) => clientRepository.updateStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tasksAction }: { id: string; tasksAction?: 'unlink' | 'delete' }) =>
      clientRepository.remove(id, tasksAction),
    onSuccess: (_data, { id }) => {
      // Invalidate everything under 'clients' EXCEPT this entity's own detail
      // query — it's gone, so refetching it would return undefined while its
      // details page is still mounted (React Query forbids undefined data).
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [root, ...rest] = query.queryKey as [string, ...unknown[]];
          if (root !== 'clients') return false;
          return !(rest[0] === 'detail' && rest[1] === id);
        },
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

export function useUploadClientAvatar() {
  const invalidate = useInvalidateClients();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const updated = await clientService.uploadAvatar(id, file);
      await clientRepository.replaceLocal(updated);
      return updated;
    },
    onSuccess: invalidate,
  });
}
