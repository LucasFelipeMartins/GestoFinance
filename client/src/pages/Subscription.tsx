import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, QrCode, Barcode, ShieldCheck, Sparkles, LogOut, Loader2, CheckCircle2, Clock3 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLogoutConfirm } from '@/hooks/useLogoutConfirm';
import { billingService } from '@/services/billingService';
import { getApiErrorMessage } from '@/services/api';
import { describePlan, formatPlanPrice } from '@/utils/plan';
import { formatCurrency } from '@/utils/formatters';

const FEATURES = [
  'Clientes, tarefas e prazos em um só lugar',
  'Receitas, despesas e parcelas do cartão',
  'Investimentos com simulador de rendimento',
  'Metas de economia',
  'Funciona offline e sincroniza entre aparelhos',
];

/**
 * The plan page: where the trial is explained, where the person pays, and
 * where Mercado Pago sends them back afterwards (`?status=…&payment_id=…`).
 */
export default function Subscription() {
  const { user, refreshAccess, applyAccess } = useAuth();
  const { requestLogout, dialog } = useLogoutConfirm();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [confirming, setConfirming] = useState<'idle' | 'checking' | 'pending' | 'done' | 'failed'>('idle');

  const access = user?.access;

  // Back from checkout: look the payment up so access is released right
  // away, without waiting for the webhook.
  useEffect(() => {
    const status = searchParams.get('status');
    const paymentId = searchParams.get('payment_id') ?? searchParams.get('collection_id');
    if (!status) return;

    const cleanUrl = () => {
      ['status', 'payment_id', 'collection_id', 'collection_status', 'external_reference', 'preference_id',
        'payment_type', 'merchant_order_id', 'site_id', 'processing_mode', 'merchant_account_id'].forEach((key) =>
        searchParams.delete(key)
      );
      setSearchParams(searchParams, { replace: true });
    };

    if (status === 'failure' || !paymentId) {
      setConfirming(status === 'failure' ? 'failed' : 'idle');
      cleanUrl();
      return;
    }

    setConfirming('checking');
    billingService
      .confirm(paymentId)
      .then((result) => {
        applyAccess(result.access);
        if (result.paymentStatus === 'approved') {
          setConfirming('done');
          toast.success('Pagamento confirmado! Seu acesso foi renovado.');
        } else if (result.paymentStatus === 'rejected' || result.paymentStatus === 'cancelled') {
          setConfirming('failed');
        } else {
          setConfirming('pending');
        }
      })
      .catch((error) => {
        setConfirming('failed');
        toast.error(getApiErrorMessage(error, 'Não foi possível confirmar o pagamento.'));
      })
      .finally(cleanUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pay = async () => {
    setIsRedirecting(true);
    try {
      const url = await billingService.checkout();
      window.location.assign(url);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível abrir o pagamento.'));
      setIsRedirecting(false);
    }
  };

  if (!access) {
    return (
      <PageContainer>
        <div className="flex items-center gap-3 text-body text-text-secondary">
          <Loader2 size={20} className="animate-spin text-sage-green" />
          Carregando seu plano…
        </div>
      </PageContainer>
    );
  }

  const plan = describePlan(access);
  const tone = { neutral: 'success', warning: 'warning', danger: 'danger' } as const;

  return (
    <PageContainer>
      <PageHeader
        title="Assinatura"
        subtitle={
          access.allowed
            ? 'Seu plano, quanto custa e como pagar.'
            : 'Seu período de acesso terminou. Renove para voltar a usar o GestorFinance.'
        }
      />

      {confirming === 'checking' && (
        <Notice icon={<Loader2 size={18} className="animate-spin" />} text="Confirmando seu pagamento com o Mercado Pago…" />
      )}
      {confirming === 'pending' && (
        <Notice
          icon={<Clock3 size={18} />}
          text="Pagamento em análise. Boleto e alguns cartões levam até 2 dias úteis — seu acesso é liberado sozinho assim que compensar."
        />
      )}
      {confirming === 'done' && <Notice icon={<CheckCircle2 size={18} />} text="Tudo certo! Acesso renovado." />}
      {confirming === 'failed' && (
        <Notice icon={<Clock3 size={18} />} text="O pagamento não foi concluído. Você pode tentar de novo quando quiser." tone="danger" />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">Sua situação</p>
              <h3 className="mt-1 text-h3 text-text-primary">{plan.title}</h3>
              <p className="mt-1 text-body text-text-secondary">{plan.detail}</p>
            </div>
            <Badge tone={tone[plan.tone]}>{access.allowed ? 'Ativo' : 'Vencido'}</Badge>
          </div>

          {plan.canPay && (
            <div className="mt-6 flex flex-col gap-3">
              <Button
                onClick={pay}
                isLoading={isRedirecting}
                leftIcon={<ShieldCheck size={18} />}
                className="w-full"
                disabled={!access.billingEnabled}
              >
                {access.reason === 'paid' ? 'Renovar' : 'Assinar'} por {formatPlanPrice(access)}
              </Button>
              <p className="text-caption text-text-secondary">
                {access.reason === 'trial'
                  ? `Pagando agora, os ${access.periodDays} dias começam a contar depois do teste — você não perde nenhum dia.`
                  : access.reason === 'paid'
                    ? `A renovação soma ${access.periodDays} dias ao que ainda falta.`
                    : `Cada pagamento libera ${access.periodDays} dias de acesso.`}
              </p>
              {!access.billingEnabled && (
                <p className="text-caption text-danger">Os pagamentos ainda não foram configurados neste servidor.</p>
              )}
            </div>
          )}

          {!access.allowed && (
            <Button variant="ghost" leftIcon={<LogOut size={17} />} onClick={requestLogout} className="mt-3 w-full">
              Sair da conta
            </Button>
          )}
        </Card>

        <Card>
          <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">O plano</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-display tabular-nums text-text-primary">{formatCurrency(access.priceMonthly)}</span>
            <span className="text-body text-text-secondary">a cada {access.periodDays} dias</span>
          </p>
          <p className="mt-1 text-caption text-text-secondary">
            {access.trialDays} dias grátis para começar · sem fidelidade · pague só quando quiser continuar.
          </p>

          <ul className="mt-5 flex flex-col gap-2">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-body text-text-primary">
                <Sparkles size={15} className="mt-1 shrink-0 text-sage-green" />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-border pt-4">
            <p className="text-caption font-semibold text-text-secondary">Formas de pagamento</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <PayMethod icon={<QrCode size={15} />} label="Pix (na hora)" />
              <PayMethod icon={<CreditCard size={15} />} label="Cartão de crédito ou débito" />
              <PayMethod icon={<Barcode size={15} />} label="Boleto (até 2 dias úteis)" />
            </div>
            <p className="mt-2 text-caption text-text-secondary">Pagamento processado pelo Mercado Pago.</p>
          </div>
        </Card>
      </div>
      {dialog}
    </PageContainer>
  );
}

function PayMethod({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-badge border border-border bg-surface px-3 py-1.5 text-caption text-text-primary">
      {icon}
      {label}
    </span>
  );
}

function Notice({ icon, text, tone = 'ok' }: { icon: React.ReactNode; text: string; tone?: 'ok' | 'danger' }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-input px-4 py-3 text-body ${
        tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-tint text-text-primary'
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${tone === 'danger' ? '' : 'text-sage-green'}`}>{icon}</span>
      {text}
    </div>
  );
}
