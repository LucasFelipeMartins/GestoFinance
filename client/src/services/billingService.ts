import { api } from './api';
import { AccessInfo } from '@/types';

export interface CancelResult {
  subscriptionCancelled: boolean;
  refunds: { paymentId: string; amount: number; status: string }[];
  refundedNow: number;
  refundManual: number;
  accessUntil?: string;
}

export const billingService = {
  async status(): Promise<AccessInfo> {
    const { data } = await api.get<{ access: AccessInfo }>('/billing/status');
    return data.access;
  },

  /** Pix / boleto for one period: returns the Mercado Pago checkout URL. */
  async checkout(): Promise<string> {
    const { data } = await api.post<{ url: string }>('/billing/checkout');
    return data.url;
  },

  /** Card with automatic renewal: returns the Mercado Pago authorisation URL. */
  async subscribe(): Promise<string> {
    const { data } = await api.post<{ url: string }>('/billing/subscribe');
    return data.url;
  },

  /** Back from Mercado Pago: asks the server to look the payment up. */
  async confirm(paymentId: string): Promise<{ paymentStatus: string; access: AccessInfo }> {
    const { data } = await api.post<{ paymentStatus: string; access: AccessInfo }>('/billing/confirm', {
      paymentId,
    });
    return data;
  },

  /** Back from the card authorisation page. */
  async confirmSubscription(
    preapprovalId: string
  ): Promise<{ subscriptionStatus: string; paymentsApplied: number; access: AccessInfo }> {
    const { data } = await api.post<{
      subscriptionStatus: string;
      paymentsApplied: number;
      access: AccessInfo;
    }>('/billing/confirm-subscription', { preapprovalId });
    return data;
  },

  async cancel(): Promise<{ result: CancelResult; access: AccessInfo }> {
    const { data } = await api.post<{ result: CancelResult; access: AccessInfo }>('/billing/cancel');
    return data;
  },
};
