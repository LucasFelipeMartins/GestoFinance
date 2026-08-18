import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientService, ClientListParams, ClientPayload } from '@/services/clientService';
import { EntityStatus } from '@/types';

export const clientsKey = (params: ClientListParams = {}) => ['clients', params] as const;
export const clientKey = (id: string) => ['clients', 'detail', id] as const;

export function useClients(params: ClientListParams = {}) {
  return useQuery({
    queryKey: clientsKey(params),
    queryFn: () => clientService.list(params),
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: clientKey(id ?? ''),
    queryFn: () => clientService.get(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateClients() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useCreateClient() {
  const invalidate = useInvalidateClients();
  return useMutation({
    mutationFn: (payload: ClientPayload) => clientService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateClient() {
  const invalidate = useInvalidateClients();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ClientPayload> }) =>
      clientService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateClientStatus() {
  const invalidate = useInvalidateClients();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EntityStatus }) =>
      clientService.updateStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tasksAction }: { id: string; tasksAction?: 'unlink' | 'delete' }) =>
      clientService.remove(id, tasksAction),
    onSuccess: (_data, { id }) => {
      // Invalidate everything under 'clients' EXCEPT this entity's own detail query —
      // it's gone, so refetching it would only 404 while its details page is still mounted.
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [root, ...rest] = query.queryKey as [string, ...unknown[]];
          if (root !== 'clients') return false;
          return !(rest[0] === 'detail' && rest[1] === id);
        },
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUploadClientAvatar() {
  const invalidate = useInvalidateClients();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => clientService.uploadAvatar(id, file),
    onSuccess: invalidate,
  });
}
