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
      const paidUntil = access.paidUntil ? formatDate(access.paidUntil) : '—';
      // Paid while the free trial is still running: the paid days only start
      // counting when the free ones end — say so, or it looks like the trial vanished.
      const trialEnd = access.trialEndsAt ? new Date(access.trialEndsAt) : undefined;
      const trialRunning = trialEnd !== undefined && trialEnd.getTime() > Date.now();
      const freeDaysLeft = trialRunning
        ? Math.max(1, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
        : 0;
      const nextCharge = access.subscription?.nextChargeAt
        ? formatDate(access.subscription.nextChargeAt)
        : undefined;
      const detail = trialRunning
        ? `Seus ${plural(freeDaysLeft, 'dia')} grátis continuam até ${formatDate(trialEnd)}; os ${access.periodDays} dias pagos começam depois e vão até ${paidUntil}.`
        : renewing
          ? `Pago até ${paidUntil}${nextCharge ? ` · próxima cobrança no cartão em ${nextCharge}` : ''}.`
          : `Pago até ${paidUntil} · ${plural(access.daysLeft, 'dia')} restante${access.daysLeft === 1 ? '' : 's'}.`;
      return {
        title: renewing ? 'Assinatura ativa · renovação automática' : 'Assinatura ativa',
        detail,
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
