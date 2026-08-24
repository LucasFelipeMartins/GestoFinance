import { api } from './api';
import { FinanceEntry, FinanceKind, PaymentMethod } from '@/types';

export interface FinanceListParams {
  search?: string;
  kind?: FinanceKind;
  paid?: boolean;
  clientId?: string;
  sort?: 'date' | 'amount' | 'createdAt' | 'description';
  order?: 'asc' | 'desc';
}

/** What we send the server — mirrors server/src/validators/finance.validators.ts. */
export interface FinanceCreatePayload {
  localId: string;
  kind: FinanceKind;
  description: string;
  amount: number;
  date: string;
  category?: string;
  notes?: string;
  clientId?: string;
  paid?: boolean;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  installments?: number;
  cdiPercent?: number;
  createdAt: string;
  updatedAt: string;
}

export type FinanceUpdatePayload = Partial<Omit<FinanceCreatePayload, 'localId' | 'createdAt'>> & {
  updatedAt: string;
};

interface ApiFinanceEntry extends Omit<FinanceEntry, 'id'> {
  localId: string;
}

function fromApi(raw: ApiFinanceEntry): FinanceEntry {
  const { localId, ...rest } = raw;
  return { id: localId, ...rest, paid: Boolean(rest.paid) };
}

export const financeService = {
  async list(params: FinanceListParams = {}): Promise<FinanceEntry[]> {
    const { data } = await api.get<{ entries: ApiFinanceEntry[] }>('/finance', { params });
    return data.entries.map(fromApi);
  },

  async get(id: string): Promise<FinanceEntry> {
    const { data } = await api.get<{ entry: ApiFinanceEntry }>(`/finance/${id}`);
    return fromApi(data.entry);
  },

  async create(payload: FinanceCreatePayload): Promise<FinanceEntry> {
    const { data } = await api.post<{ entry: ApiFinanceEntry }>('/finance', payload);
    return fromApi(data.entry);
  },

  async update(id: string, payload: FinanceUpdatePayload): Promise<FinanceEntry> {
    const { data } = await api.put<{ entry: ApiFinanceEntry }>(`/finance/${id}`, payload);
    return fromApi(data.entry);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/finance/${id}`);
  },
};
