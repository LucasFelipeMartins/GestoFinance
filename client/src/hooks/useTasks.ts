import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskRepository, TaskFormInput } from '@/repositories/taskRepository';
import { TaskListParams } from '@/services/taskService';
import { EntityStatus } from '@/types';

export const tasksKey = (params: TaskListParams = {}) => ['tasks', params] as const;
export const taskKey = (id: string) => ['tasks', 'detail', id] as const;

export function useTasks(params: TaskListParams = {}) {
  return useQuery({
    queryKey: tasksKey(params),
    queryFn: () => taskRepository.list(params),
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: taskKey(id ?? ''),
    queryFn: () => taskRepository.get(id as string),
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
    mutationFn: (payload: TaskFormInput) => taskRepository.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TaskFormInput> }) =>
      taskRepository.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTaskStatus() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EntityStatus }) => taskRepository.updateStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskRepository.remove(id),
    onSuccess: (_data, id) => {
      // Same reasoning as useDeleteClient: skip the just-deleted entity's own
      // detail query so a still-mounted details page doesn't refetch it and
      // get undefined back.
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
