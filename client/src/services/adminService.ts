import { api } from './api';

export interface FreeAccount {
  email: string;
  note?: string;
  createdAt: string;
  /** Set once the person has actually created their account. */
  userName?: string;
}

export const adminService = {
  async listFreeAccounts(): Promise<FreeAccount[]> {
    const { data } = await api.get<{ accounts: FreeAccount[] }>('/admin/free-accounts');
    return data.accounts;
  },

  async addFreeAccount(email: string, note?: string): Promise<void> {
    await api.post('/admin/free-accounts', { email, note: note || undefined });
  },

  async removeFreeAccount(email: string): Promise<void> {
    await api.delete(`/admin/free-accounts/${encodeURIComponent(email)}`);
  },
};
