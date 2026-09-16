import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  QrCode,
  Barcode,
  RefreshCw,
  Sparkles,
  LogOut,
  Loader2,
  CheckCircle2,
  Clock3,
  XCircle,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { CardSubscriptionModal, CardBrickFormData } from '@/components/billing/CardSubscriptionModal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLogoutConfirm } from '@/hooks/useLogoutConfirm';
import { billingService } from '@/services/billingService';
import { getApiErrorMessage } from '@/services/api';
import { describePlan, formatPlanPrice } from '@/utils/plan';
import { formatCurrency, formatDate } from '@/utils/formatters';

const FEATURES = [
  'Clientes, tarefas e prazos em um só lugar',
  'Receitas, despesas e parcelas do cartão',
  'Investimentos com simulador de rendimento',
  'Metas de economia',
  'Acesse de qualquer aparelho pelo navegador',
];

type ConfirmState = 'idle' | 'checking' | 'pending' | 'done' | 'failed' | 'subscribed';

/**
 * The plan page: where the trial is explained, where the person pays — by
 * card (renews itself) or Pix/boleto (one period) — cancels, and where
 * Mercado Pago sends them back afterwards (`?status=…`).
 */
export default function Subscription() {
  const { user, refreshAccess, applyAccess } = useAuth();
  const { requestLogout, dialog } = useLogoutConfirm();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);
  const [confirming, setConfirming] = useState<ConfirmState>('idle');
  const [cardOpen, setCardOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const access = user?.access;

  // Back from Mercado Pago: look the payment (or the subscription) up so
  // access is released right away, without waiting for the webhook.
  useEffect(() => {
    const status = searchParams.get('status');
    if (!status) return;
    const paymentId = searchParams.get('payment_id') ?? searchParams.get('collection_id');
    const preapprovalId = searchParams.get('preapproval_id');

    const cleanUrl = () => {
      [
        'status',
        'payment_id',
        'collection_id',
        'collection_status',
        'external_reference',
        'preference_id',
        'payment_type',
        'merchant_order_id',
        'site_id',
        'processing_mode',
        'merchant_account_id',
        'preapproval_id',
      ].forEach((key) => searchParams.delete(key));
      setSearchParams(searchParams, { replace: true });
    };

    if (status === 'subscribed' && preapprovalId) {
      setConfirming('checking');
      billingService
        .confirmSubscription(preapprovalId)
        .then((result) => {
          applyAccess(result.access);
          if (result.subscriptionStatus === 'authorized') {
            setConfirming('subscribed');
            toast.success('Renovação automática ativada!');
          } else {
            setConfirming('pending');
          }
        })
        .catch((error) => {
          setConfirming('failed');
          toast.error(getApiErrorMessage(error, 'Não foi possível confirmar a assinatura.'));
        })
        .finally(cleanUrl);
      return;
    }

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

  const payWithPix = async () => {
    setRedirecting(true);
    try {
      window.location.assign(await billingService.checkout());
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível abrir o pagamento.'));
      setRedirecting(false);
    }
  };

  // Card token from the Brick -> subscription on the server. Errors are
  // rethrown with a readable message so the modal can show them.
  const subscribeWithCard = async (formData: CardBrickFormData) => {
    try {
      const result = await billingService.subscribe(formData.token);
      applyAccess(result.access);
      setCardOpen(false);
      if (result.subscriptionStatus === 'authorized') {
        setConfirming('subscribed');
        toast.success('Renovação automática ativada!');
        // The first charge can take a few seconds to show up on the plan.
        if (result.paymentsApplied === 0) setTimeout(() => refreshAccess(), 4000);
      } else {
        setConfirming('pending');
      }
    } catch (error) {
      throw new Error(
        getApiErrorMessage(error, 'O Mercado Pago não aceitou o cartão. Confira os dados e tente de novo.')
      );
    }
  };

  const cancelPlan = async () => {
    setCancelling(true);
    try {
      const { result, access: fresh } = await billingService.cancel();
      applyAccess(fresh);
      setCancelOpen(false);
      if (result.refundedNow > 0) {
        toast.success(
          `Plano cancelado. Estorno de ${formatCurrency(result.refundedNow)} solicitado ao Mercado Pago.`
        );
      } else if (result.refundManual > 0) {
        toast.success('Plano cancelado. O estorno será feito manualmente em até 5 dias úteis.');
      } else {
        toast.success('Renovação automática cancelada. Seu acesso continua até o fim do período pago.');
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível cancelar agora.'));
    } finally {
      setCancelling(false);
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
  const subscription = access.subscription;
  const renewing = subscription?.status === 'authorized';
  const preview = access.cancelPreview;
  const canCancel = Boolean(preview && !preview.nothing);

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
        <Notice
          icon={<Loader2 size={18} className="animate-spin" />}
          text="Confirmando com o Mercado Pago…"
        />
      )}
      {confirming === 'pending' && (
        <Notice
          icon={<Clock3 size={18} />}
          text="Pagamento em análise. Boleto e alguns cartões levam até 2 dias úteis — seu acesso é liberado sozinho assim que compensar."
        />
      )}
      {confirming === 'done' && (
        <Notice icon={<CheckCircle2 size={18} />} text="Tudo certo! Acesso renovado." />
      )}
      {confirming === 'subscribed' && (
        <Notice
          icon={<CheckCircle2 size={18} />}
          text={`Renovação automática ativada. A cada ${access.periodDays} dias o cartão é cobrado sozinho; cancele quando quiser aqui mesmo.`}
        />
      )}
      {confirming === 'failed' && (
        <Notice
          icon={<XCircle size={18} />}
          text="O pagamento não foi concluído. Você pode tentar de novo quando quiser."
          tone="danger"
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
                Sua situação
              </p>
              <h3 className="mt-1 text-h3 text-text-primary">{plan.title}</h3>
              <p className="mt-1 text-body text-text-secondary">{plan.detail}</p>
            </div>
            <Badge tone={tone[plan.tone]}>{access.allowed ? 'Ativo' : 'Vencido'}</Badge>
          </div>

          {subscription && (
            <div className="mt-4 flex items-start gap-3 rounded-input bg-tint px-4 py-3 text-body text-text-primary">
              <RefreshCw size={18} className="mt-0.5 shrink-0 text-sage-green" />
              <div>
                {renewing && (
                  <>
                    <p className="font-semibold">Renovação automática ativa</p>
                    <p className="text-caption text-text-secondary">
                      Próxima cobrança de {formatCurrency(access.priceMonthly)} no cartão
                      {subscription.nextChargeAt ? ` em ${formatDate(subscription.nextChargeAt)}` : ''}.
                    </p>
                  </>
                )}
                {subscription.status === 'pending' && (
                  <>
                    <p className="font-semibold">Assinatura aguardando o cartão</p>
                    <p className="text-caption text-text-secondary">
                      A autorização no Mercado Pago não foi concluída. Você pode tentar de novo abaixo.
                    </p>
                  </>
                )}
                {subscription.status === 'paused' && (
                  <>
                    <p className="font-semibold">Renovação pausada pelo Mercado Pago</p>
                    <p className="text-caption text-text-secondary">
                      A última cobrança no cartão não passou. Assine de novo para reativar.
                    </p>
                  </>
                )}
                {subscription.status === 'cancelled' && (
                  <>
                    <p className="font-semibold">Renovação automática cancelada</p>
                    <p className="text-caption text-text-secondary">
                      Não haverá nova cobrança.
                      {access.paidUntil && access.allowed
                        ? ` Seu acesso continua até ${formatDate(access.paidUntil)}.`
                        : ''}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {plan.canPay && !renewing && (
            <div className="mt-6 flex flex-col gap-3">
              <Button
                onClick={() => setCardOpen(true)}
                disabled={!access.billingEnabled || !access.mpPublicKey || redirecting}
                leftIcon={<CreditCard size={18} />}
                className="w-full"
              >
                Cartão — {formatPlanPrice(access)} com renovação automática
              </Button>
              <Button
                variant="secondary"
                onClick={payWithPix}
                isLoading={redirecting}
                disabled={!access.billingEnabled || redirecting}
                leftIcon={<QrCode size={18} />}
                className="w-full"
              >
                Pix ou boleto — {formatCurrency(access.priceMonthly)} por {access.periodDays} dias
              </Button>
              <p className="text-caption text-text-secondary">
                No cartão, a cobrança se repete a cada {access.periodDays} dias até você cancelar — sem
                fidelidade.
                {access.reason === 'trial'
                  ? ` Pagando agora, os dias começam a contar depois do teste — você não perde nenhum dia.`
                  : access.reason === 'paid'
                    ? ` Um novo pagamento soma ${access.periodDays} dias ao que ainda falta.`
                    : ''}
              </p>
              {!access.billingEnabled && (
                <p className="text-caption text-danger">
                  Os pagamentos ainda não foram configurados neste servidor.
                </p>
              )}
            </div>
          )}

          {canCancel && (
            <Button
              variant="ghost"
              leftIcon={<XCircle size={17} />}
              onClick={() => setCancelOpen(true)}
              className="mt-3 w-full text-danger hover:bg-danger/10"
            >
              Cancelar plano
            </Button>
          )}

          {!access.allowed && (
            <Button
              variant="ghost"
              leftIcon={<LogOut size={17} />}
              onClick={requestLogout}
              className="mt-3 w-full"
            >
              Sair da conta
            </Button>
          )}
        </Card>

        <Card>
          <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">O plano</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-display tabular-nums text-text-primary">
              {formatCurrency(access.priceMonthly)}
            </span>
            <span className="text-body text-text-secondary">a cada {access.periodDays} dias</span>
          </p>
          <p className="mt-1 text-caption text-text-secondary">
            {access.trialDays} dias grátis para começar · sem fidelidade · cancele quando quiser.
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
              <PayMethod icon={<CreditCard size={15} />} label="Cartão de crédito (renova sozinho)" />
              <PayMethod icon={<QrCode size={15} />} label="Pix (na hora)" />
              <PayMethod icon={<Barcode size={15} />} label="Boleto (até 2 dias úteis)" />
            </div>
            <p className="mt-2 text-caption text-text-secondary">
              Pagamento processado pelo Mercado Pago. Ao cancelar: no cartão a renovação para e o acesso vai
              até o fim do período pago; no Pix, os dias não usados são devolvidos; no boleto, o acesso vai
              até o fim do período.
            </p>
          </div>
        </Card>
      </div>

      {access.mpPublicKey && user && (
        <CardSubscriptionModal
          open={cardOpen}
          onOpenChange={setCardOpen}
          publicKey={access.mpPublicKey}
          amount={access.priceMonthly}
          periodDays={access.periodDays}
          email={user.email}
          onSubmit={subscribeWithCard}
        />
      )}

      <Modal
        open={cancelOpen}
        onOpenChange={(open) => !cancelling && setCancelOpen(open)}
        title="Cancelar plano"
        description="Veja o que acontece antes de confirmar."
        preventOutsideClose={cancelling}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Manter plano
            </Button>
            <Button variant="danger" onClick={cancelPlan} isLoading={cancelling}>
              Confirmar cancelamento
            </Button>
          </div>
        }
      >
        <ul className="flex flex-col gap-3 text-body text-text-primary">
          {preview?.subscription && (
            <li className="flex items-start gap-2">
              <CreditCard size={17} className="mt-0.5 shrink-0 text-sage-green" />
              <span>
                A renovação automática no cartão é encerrada — nenhuma nova cobrança.
                {preview.subscription.accessUntil && (
                  <>
                    {' '}
                    Você continua usando até <strong>{formatDate(preview.subscription.accessUntil)}</strong>.
                  </>
                )}
              </span>
            </li>
          )}
          {preview?.refund && (
            <li className="flex items-start gap-2">
              <QrCode size={17} className="mt-0.5 shrink-0 text-sage-green" />
              <span>
                Pagamento por Pix: <strong>{formatCurrency(preview.refund.total)}</strong> voltam para você (
                {preview.refund.unusedDays}{' '}
                {preview.refund.unusedDays === 1 ? 'dia não usado' : 'dias não usados'}). O acesso encerra
                agora.
              </span>
            </li>
          )}
          {preview?.refund && (
            <li className="text-caption text-text-secondary">
              O estorno é pedido ao Mercado Pago na hora e costuma cair na mesma conta em instantes; em casos
              raros é feito manualmente em até 5 dias úteis.
            </li>
          )}
        </ul>
      </Modal>
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

function Notice({
  icon,
  text,
  tone = 'ok',
}: {
  icon: React.ReactNode;
  text: string;
  tone?: 'ok' | 'danger';
}) {
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
