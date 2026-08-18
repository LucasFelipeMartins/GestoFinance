import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskService, TaskListParams, TaskPayload } from '@/services/taskService';
import { EntityStatus } from '@/types';

export const tasksKey = (params: TaskListParams = {}) => ['tasks', params] as const;
export const taskKey = (id: string) => ['tasks', 'detail', id] as const;

export function useTasks(params: TaskListParams = {}) {
  return useQuery({
    queryKey: tasksKey(params),
    queryFn: () => taskService.list(params),
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: taskKey(id ?? ''),
    queryFn: () => taskService.get(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (payload: TaskPayload) => taskService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TaskPayload> }) =>
      taskService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTaskStatus() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EntityStatus }) =>
      taskService.updateStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskService.remove(id),
    onSuccess: (_data, id) => {
      // Invalidate everything under 'tasks' EXCEPT this entity's own detail query —
      // it's gone, so refetching it would only 404 while its details page is still mounted.
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [root, ...rest] = query.queryKey as [string, ...unknown[]];
          if (root !== 'tasks') return false;
          return !(rest[0] === 'detail' && rest[1] === id);
        },
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
