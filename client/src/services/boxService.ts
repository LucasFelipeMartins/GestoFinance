import { api } from './api';
import { InvestmentBox } from '@/types';

/** What we send the server — mirrors server/src/validators/box.validators.ts. */
export interface BoxCreatePayload {
  localId: string;
  name: string;
  cdiPercent: number;
  color: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type BoxUpdatePayload = Partial<Omit<BoxCreatePayload, 'localId' | 'createdAt'>> & {
  updatedAt: string;
};

interface ApiBox extends Omit<InvestmentBox, 'id'> {
  localId: string;
}

function fromApi(raw: ApiBox): InvestmentBox {
  const { localId, ...rest } = raw;
  return { id: localId, ...rest };
}

export const boxService = {
  async list(): Promise<InvestmentBox[]> {
    const { data } = await api.get<{ boxes: ApiBox[] }>('/investment-boxes');
    return data.boxes.map(fromApi);
  },

  async create(payload: BoxCreatePayload): Promise<InvestmentBox> {
    const { data } = await api.post<{ box: ApiBox }>('/investment-boxes', payload);
    return fromApi(data.box);
  },

  async update(id: string, payload: BoxUpdatePayload): Promise<InvestmentBox> {
    const { data } = await api.put<{ box: ApiBox }>(`/investment-boxes/${id}`, payload);
    return fromApi(data.box);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/investment-boxes/${id}`);
  },
};
