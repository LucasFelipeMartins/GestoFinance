import { api } from './api';
import { Task, Priority, EntityStatus } from '@/types';

export interface TaskListParams {
  search?: string;
  status?: EntityStatus;
  priority?: Priority;
  clientId?: string;
  sort?: 'dueDate' | 'priority' | 'createdAt' | 'status';
  order?: 'asc' | 'desc';
}

export interface TaskPayload {
  title: string;
  description?: string;
  clientId?: string;
  dueDate?: string;
  priority: Priority;
  status?: EntityStatus;
}

export const taskService = {
  async list(params: TaskListParams = {}): Promise<Task[]> {
    const { data } = await api.get<{ tasks: Task[] }>('/tasks', { params });
    return data.tasks;
  },

  async get(id: string): Promise<Task> {
    const { data } = await api.get<{ task: Task }>(`/tasks/${id}`);
    return data.task;
  },

  async create(payload: TaskPayload): Promise<Task> {
    const { data } = await api.post<{ task: Task }>('/tasks', payload);
    return data.task;
  },

  async update(id: string, payload: Partial<TaskPayload>): Promise<Task> {
    const { data } = await api.put<{ task: Task }>(`/tasks/${id}`, payload);
    return data.task;
  },

  async updateStatus(id: string, status: EntityStatus): Promise<Task> {
    const { data } = await api.patch<{ task: Task }>(`/tasks/${id}/status`, { status });
    return data.task;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },
};
