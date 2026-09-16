import { AccessInfo } from '@/types';
import { formatCurrency, formatDate } from './formatters';

/** "R$ 11,90/mês" — one place for the price text. */
export function formatPlanPrice(access: Pick<AccessInfo, 'priceMonthly' | 'periodDays'>): string {
  const period = access.periodDays === 30 ? 'mês' : `${access.periodDays} dias`;
  return `${formatCurrency(access.priceMonthly)}/${period}`;
}

export interface PlanSummary {
  title: string;
  detail: string;
  /** neutral = fine, warning = ending soon, danger = expired. */
  tone: 'neutral' | 'warning' | 'danger';
  /** Whether the "renew / subscribe" button makes sense right now. */
  canPay: boolean;
}

/** What to tell the person about their plan, in one line each. */
export function describePlan(access: AccessInfo): PlanSummary {
  switch (access.reason) {
    case 'admin':
      return {
        title: 'Conta de administrador',
        detail: 'Acesso completo, sem cobrança.',
        tone: 'neutral',
        canPay: false,
      };
    case 'free':
      return access.billingEnabled
        ? {
            title: 'Conta gratuita',
            detail: 'Você foi liberado pelo administrador — nada a pagar.',
            tone: 'neutral',
            canPay: false,
          }
        : {
            title: 'Acesso liberado',
            detail: 'A cobrança ainda não foi ativada neste servidor.',
            tone: 'neutral',
            canPay: false,
          };
    case 'paid': {
      const renewing = access.subscription?.status === 'authorized';
      return {
        title: renewing ? 'Assinatura ativa · renovação automática' : 'Assinatura ativa',
        detail: renewing
          ? `Próxima cobrança no cartão em ${access.paidUntil ? formatDate(access.paidUntil) : '—'}.`
          : `Pago até ${access.paidUntil ? formatDate(access.paidUntil) : '—'} · ${plural(access.daysLeft, 'dia')} restante${access.daysLeft === 1 ? '' : 's'}.`,
        tone: !renewing && access.daysLeft <= 3 ? 'warning' : 'neutral',
        canPay: true,
      };
    }
    case 'trial':
      return {
        title: 'Período de teste grátis',
        detail: `${plural(access.daysLeft, 'dia')} restante${access.daysLeft === 1 ? '' : 's'} — termina em ${
          access.trialEndsAt ? formatDate(access.trialEndsAt) : '—'
        }.`,
        tone: access.daysLeft <= 3 ? 'warning' : 'neutral',
        canPay: true,
      };
    default:
      return {
        title: 'Acesso encerrado',
        detail: 'Seu período de teste ou assinatura terminou. Renove para continuar.',
        tone: 'danger',
        canPay: true,
      };
  }
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
