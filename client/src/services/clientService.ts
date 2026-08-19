import { api } from './api';
import { Client, Priority, EntityStatus } from '@/types';

export interface ClientListParams {
  search?: string;
  status?: EntityStatus;
  priority?: Priority;
  sort?: 'name' | 'price' | 'priority' | 'createdAt' | 'status';
  order?: 'asc' | 'desc';
}

/** What we send the server — mirrors server/src/validators/client.validators.ts. */
export interface ClientCreatePayload {
  localId: string;
  name: string;
  phone: string;
  service: string;
  price: number;
  priority: Priority;
  status: EntityStatus;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientUpdatePayload = Partial<Omit<ClientCreatePayload, 'localId' | 'createdAt'>> & {
  updatedAt: string;
};

/** What the server actually returns — its own internal _id plus our localId. */
interface ApiClient extends Omit<Client, 'id'> {
  localId: string;
}

function fromApi(raw: ApiClient): Client {
  const { localId, ...rest } = raw;
  return { id: localId, ...rest };
}

export const clientService = {
  async list(params: ClientListParams = {}): Promise<Client[]> {
    const { data } = await api.get<{ clients: ApiClient[] }>('/clients', { params });
    return data.clients.map(fromApi);
  },

  async get(id: string): Promise<Client> {
    const { data } = await api.get<{ client: ApiClient }>(`/clients/${id}`);
    return fromApi(data.client);
  },

  async create(payload: ClientCreatePayload): Promise<Client> {
    const { data } = await api.post<{ client: ApiClient }>('/clients', payload);
    return fromApi(data.client);
  },

  async update(id: string, payload: ClientUpdatePayload): Promise<Client> {
    const { data } = await api.put<{ client: ApiClient }>(`/clients/${id}`, payload);
    return fromApi(data.client);
  },

  async updateStatus(id: string, status: EntityStatus, updatedAt: string): Promise<Client> {
    const { data } = await api.patch<{ client: ApiClient }>(`/clients/${id}/status`, { status, updatedAt });
    return fromApi(data.client);
  },

  async remove(id: string, tasksAction: 'unlink' | 'delete' = 'unlink'): Promise<void> {
    await api.delete(`/clients/${id}`, { params: { tasksAction } });
  },

  async uploadAvatar(id: string, file: File): Promise<Client> {
    const formData = new FormData();
    formData.append('avatar', file);
    const { data } = await api.post<{ client: ApiClient }>(`/clients/${id}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return fromApi(data.client);
  },
};
