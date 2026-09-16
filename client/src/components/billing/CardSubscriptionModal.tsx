import { useEffect, useRef, useState } from 'react';
import { EyeOff, Loader2, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/utils/formatters';

const SDK_URL = 'https://sdk.mercadopago.com/js/v2';
const CONTAINER_ID = 'mp-card-brick';

/** The little we use of Mercado Pago's browser SDK. */
interface MercadoPagoSdk {
  bricks(): {
    create(type: 'cardPayment', containerId: string, settings: unknown): Promise<{ unmount(): void }>;
  };
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MercadoPagoSdk;
  }
}

/** Shape of what the Card Payment Brick hands to onSubmit. */
export interface CardBrickFormData {
  token: string;
  payment_method_id?: string;
  issuer_id?: string;
  installments?: number;
  payer?: { email?: string; identification?: { type?: string; number?: string } };
}

let sdkPromise: Promise<void> | null = null;

/** Loads Mercado Pago's SDK once; later calls reuse the same script. */
function loadSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        sdkPromise = null;
        reject(new Error('Não foi possível carregar o formulário de cartão do Mercado Pago.'));
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicKey: string;
  amount: number;
  periodDays: number;
  email: string;
  /** Receives the one-shot card token; resolves when the subscription exists. */
  onSubmit: (formData: CardBrickFormData) => Promise<void>;
}

/**
 * Card form for the subscription, rendered by Mercado Pago's Card Payment
 * Brick inside our own modal. The card number never touches our code or
 * server: the Brick exchanges it for a token, which is all we send.
 */
export function CardSubscriptionModal({
  open,
  onOpenChange,
  publicKey,
  amount,
  periodDays,
  email,
  onSubmit,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<{ unmount(): void } | null>(null);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        await loadSdk();
        if (cancelled || !window.MercadoPago) return;
        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'default';
        const controller = await mp.bricks().create('cardPayment', CONTAINER_ID, {
          initialization: { amount, payer: { email } },
          customization: {
            visual: { style: { theme }, hideFormTitle: true },
            paymentMethods: { maxInstallments: 1 },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setLoading(false);
            },
            onSubmit: async (formData: CardBrickFormData) => {
              setSubmitting(true);
              setError(null);
              try {
                await onSubmitRef.current(formData);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Não foi possível concluir a assinatura.');
                // Rejecting tells the Brick to re-enable its button.
                throw err;
              } finally {
                setSubmitting(false);
              }
            },
            onError: (brickError: { message?: string }) => {
              // eslint-disable-next-line no-console
              console.error('[mp brick]', brickError);
              if (!cancelled) {
                setLoading(false);
                setError(
                  'O formulário de cartão encontrou um problema. Recarregue a página e tente de novo.'
                );
              }
            },
          },
        });
        if (cancelled) controller.unmount();
        else controllerRef.current = controller;
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          setError(err instanceof Error ? err.message : 'Não foi possível abrir o formulário de cartão.');
        }
      }
    })();

    return () => {
      cancelled = true;
      controllerRef.current?.unmount();
      controllerRef.current = null;
    };
  }, [open, publicKey, amount, email]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !submitting && onOpenChange(next)}
      title="Assinar com cartão"
      description={`${formatCurrency(amount)} agora e a cada ${periodDays} dias, até você cancelar.`}
      size="lg"
      preventOutsideClose={submitting}
    >
      {/* Who is actually handling the card — said up front, with their mark. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-input border border-border bg-surface-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 items-center rounded-[10px] bg-white px-2.5 shadow-sm">
            <img src="/mercado-pago.png" alt="Mercado Pago" className="h-6 w-auto" width={92} height={24} />
          </span>
          <div className="leading-tight">
            <p className="text-body-strong text-text-primary">Pagamento processado pelo Mercado Pago</p>
            <p className="text-caption text-text-secondary">
              Formulário e criptografia do próprio Mercado Pago
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-badge bg-tint px-2.5 py-1 text-caption font-semibold text-sage-green">
          <Lock size={13} />
          Conexão segura
        </span>
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-6 text-body text-text-secondary">
          <Loader2 size={20} className="animate-spin text-sage-green" />
          Carregando o formulário seguro do Mercado Pago…
        </div>
      )}
      {error && <p className="mb-3 rounded-input bg-danger/10 px-4 py-3 text-body text-danger">{error}</p>}
      {/* The Brick renders itself here (inside Mercado Pago's own secure iframes). */}
      <div id={CONTAINER_ID} className={loading ? 'hidden' : ''} />

      <div className="mt-4 rounded-input border border-dashed border-border px-4 py-3">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
          O que acontece com seus dados
        </p>
        <ul className="mt-2 flex flex-col gap-2 text-caption text-text-primary">
          <li className="flex items-start gap-2">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-sage-green" />
            <span>
              Os campos do cartão acima pertencem ao Mercado Pago: o número, a validade e o código vão
              criptografados direto para eles, sem passar pelo GestorFinance.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <EyeOff size={15} className="mt-0.5 shrink-0 text-sage-green" />
            <span>
              O GestorFinance <strong>não vê, não recebe e não guarda</strong> os dados do seu cartão — só é
              avisado se a cobrança foi autorizada ou não.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <RefreshCw size={15} className="mt-0.5 shrink-0 text-sage-green" />
            <span>
              {formatCurrency(amount)} agora e a cada {periodDays} dias. Cancele quando quiser na página
              Assinatura, sem multa nem fidelidade.
            </span>
          </li>
        </ul>
      </div>
    </Modal>
  );
}
