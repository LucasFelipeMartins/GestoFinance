import { api } from './api';
import { AccessInfo } from '@/types';

export const billingService = {
  async status(): Promise<AccessInfo> {
    const { data } = await api.get<{ access: AccessInfo }>('/billing/status');
    return data.access;
  },

  /** Returns the Mercado Pago checkout URL to send the person to. */
  async checkout(): Promise<string> {
    const { data } = await api.post<{ url: string }>('/billing/checkout');
    return data.url;
  },

  /** Back from Mercado Pago: asks the server to look the payment up. */
  async confirm(paymentId: string): Promise<{ paymentStatus: string; access: AccessInfo }> {
    const { data } = await api.post<{ paymentStatus: string; access: AccessInfo }>('/billing/confirm', {
      paymentId,
    });
    return data;
  },
};
