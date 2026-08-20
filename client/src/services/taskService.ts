import { api } from './api';
import { Task, TaskWithClient, TaskClientRef, Priority, EntityStatus } from '@/types';

export interface TaskListParams {
  search?: string;
  status?: EntityStatus;
  priority?: Priority;
  clientId?: string;
  sort?: 'dueDate' | 'priority' | 'createdAt' | 'status';
  order?: 'asc' | 'desc';
}

/** What we send the server — mirrors server/src/validators/task.validators.ts. */
export interface TaskCreatePayload {
  localId: string;
  title: string;
  description?: string;
  clientId?: string;
  dueDate?: string;
  priority: Priority;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  reminderEnabled?: boolean;
}

export type TaskUpdatePayload = Partial<Omit<TaskCreatePayload, 'localId' | 'createdAt'>> & {
  updatedAt: string;
};

interface ApiClientRef {
  localId: string;
  name: string;
  avatarUrl?: string;
  initials: string;
}

interface ApiTask extends Omit<Task, 'id' | 'clientId'> {
  localId: string;
  clientId?: string | ApiClientRef;
}

function fromApi(raw: ApiTask): TaskWithClient {
  const { localId, clientId, ...rest } = raw;
  const isPopulated = typeof clientId === 'object' && clientId !== null;
  const client: TaskClientRef | undefined = isPopulated
    ? {
        id: (clientId as ApiClientRef).localId,
        name: (clientId as ApiClientRef).name,
        avatarUrl: (clientId as ApiClientRef).avatarUrl,
        initials: (clientId as ApiClientRef).initials,
      }
    : undefined;

  return {
    id: localId,
    ...rest,
    clientId: isPopulated ? (clientId as ApiClientRef).localId : (clientId as string | undefined),
    client,
  };
}

export const taskService = {
  async list(params: TaskListParams = {}): Promise<TaskWithClient[]> {
    const { data } = await api.get<{ tasks: ApiTask[] }>('/tasks', { params });
    return data.tasks.map(fromApi);
  },

  async get(id: string): Promise<TaskWithClient> {
    const { data } = await api.get<{ task: ApiTask }>(`/tasks/${id}`);
    return fromApi(data.task);
  },

  async create(payload: TaskCreatePayload): Promise<TaskWithClient> {
    const { data } = await api.post<{ task: ApiTask }>('/tasks', payload);
    return fromApi(data.task);
  },

  async update(id: string, payload: TaskUpdatePayload): Promise<TaskWithClient> {
    const { data } = await api.put<{ task: ApiTask }>(`/tasks/${id}`, payload);
    return fromApi(data.task);
  },

  async updateStatus(id: string, status: EntityStatus, updatedAt: string, completedAt?: string): Promise<TaskWithClient> {
    const { data } = await api.patch<{ task: ApiTask }>(`/tasks/${id}/status`, { status, updatedAt, completedAt });
    return fromApi(data.task);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },
};
