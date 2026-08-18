import { api } from './api';
import { Client, Priority, EntityStatus } from '@/types';

export interface ClientListParams {
  search?: string;
  status?: EntityStatus;
  priority?: Priority;
  sort?: 'name' | 'price' | 'priority' | 'createdAt' | 'status';
  order?: 'asc' | 'desc';
}

export interface ClientPayload {
  name: string;
  phone: string;
  service: string;
  price: number;
  priority: Priority;
  status?: EntityStatus;
}

export const clientService = {
  async list(params: ClientListParams = {}): Promise<Client[]> {
    const { data } = await api.get<{ clients: Client[] }>('/clients', { params });
    return data.clients;
  },

  async get(id: string): Promise<Client> {
    const { data } = await api.get<{ client: Client }>(`/clients/${id}`);
    return data.client;
  },

  async create(payload: ClientPayload): Promise<Client> {
    const { data } = await api.post<{ client: Client }>('/clients', payload);
    return data.client;
  },

  async update(id: string, payload: Partial<ClientPayload>): Promise<Client> {
    const { data } = await api.put<{ client: Client }>(`/clients/${id}`, payload);
    return data.client;
  },

  async updateStatus(id: string, status: EntityStatus): Promise<Client> {
    const { data } = await api.patch<{ client: Client }>(`/clients/${id}/status`, { status });
    return data.client;
  },

  async remove(id: string, tasksAction: 'unlink' | 'delete' = 'unlink'): Promise<void> {
    await api.delete(`/clients/${id}`, { params: { tasksAction } });
  },

  async uploadAvatar(id: string, file: File): Promise<Client> {
    const formData = new FormData();
    formData.append('avatar', file);
    const { data } = await api.post<{ client: Client }>(`/clients/${id}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.client;
  },
};
