import { createHmac, timingSafeEqual } from 'crypto';
import { MercadoPagoConfig, Preference, Payment as MpPayment } from 'mercadopago';
import { Request } from 'express';
import { User, UserDocument } from '../models/User';
import { FreeAccount, Payment } from '../models/Billing';
import { billingEnv } from '../config/env';
import { ApiError } from '../utils/ApiError';

const DAY_MS = 24 * 60 * 60 * 1000;

export type AccessReason = 'admin' | 'free' | 'paid' | 'trial' | 'expired';

/** What the client needs to decide between "let them in" and "show the paywall". */
export interface AccessInfo {
  allowed: boolean;
  reason: AccessReason;
  isAdmin: boolean;
  /** Whole days of access left (trial or paid); 0 when expired or unlimited. */
  daysLeft: number;
  trialEndsAt?: string;
  paidUntil?: string;
  /** When the current access period ends, whichever kind it is. */
  accessEndsAt?: string;
  priceMonthly: number;
  periodDays: number;
  trialDays: number;
  /** False until MP_ACCESS_TOKEN is set — everybody is let in meanwhile. */
  billingEnabled: boolean;
}

export function isBillingEnabled(): boolean {
  return Boolean(billingEnv.mpAccessToken);
}

export function isAdminEmail(email: string): boolean {
  return billingEnv.adminEmails.includes(email.toLowerCase());
}

async function isFreeEmail(email: string): Promise<boolean> {
  const row = await FreeAccount.findOne({ email: email.toLowerCase() }).lean();
  return Boolean(row);
}

/**
 * Every account gets its trial stamp exactly once. Accounts that predate
 * billing have none, so their trial starts the first time they show up after
 * the feature went live — nobody wakes up locked out.
 */
export async function ensureTrial(user: UserDocument): Promise<void> {
  if (user.trialEndsAt) return;
  user.trialEndsAt = new Date(Date.now() + billingEnv.trialDays * DAY_MS);
  await user.save();
}

function daysUntil(date: Date | undefined, now: number): number {
  if (!date) return 0;
  return Math.max(0, Math.ceil((date.getTime() - now) / DAY_MS));
}

export async function computeAccess(user: UserDocument): Promise<AccessInfo> {
  const now = Date.now();
  const isAdmin = isAdminEmail(user.email);
  const base = {
    isAdmin,
    trialEndsAt: user.trialEndsAt?.toISOString(),
    paidUntil: user.paidUntil?.toISOString(),
    priceMonthly: billingEnv.priceMonthly,
    periodDays: billingEnv.periodDays,
    trialDays: billingEnv.trialDays,
    billingEnabled: isBillingEnabled(),
  };

  if (isAdmin) return { ...base, allowed: true, reason: 'admin', daysLeft: 0 };
  if (await isFreeEmail(user.email)) return { ...base, allowed: true, reason: 'free', daysLeft: 0 };

  if (user.paidUntil && user.paidUntil.getTime() > now) {
    return {
      ...base,
      allowed: true,
      reason: 'paid',
      daysLeft: daysUntil(user.paidUntil, now),
      accessEndsAt: user.paidUntil.toISOString(),
    };
  }
  if (user.trialEndsAt && user.trialEndsAt.getTime() > now) {
    return {
      ...base,
      allowed: true,
      reason: 'trial',
      daysLeft: daysUntil(user.trialEndsAt, now),
      accessEndsAt: user.trialEndsAt.toISOString(),
    };
  }

  // Nothing configured yet: don't lock anyone out of an app that can't even
  // take their money. The plan page explains the state.
  if (!isBillingEnabled()) return { ...base, allowed: true, reason: 'free', daysLeft: 0 };

  return { ...base, allowed: false, reason: 'expired', daysLeft: 0 };
}

/* ------------------------------------------------------------------ */
/* Mercado Pago                                                        */
/* ------------------------------------------------------------------ */

/**
 * The SDK rejects with a plain object ({ message, status, cause }) rather
 * than an Error. Turn it into a readable 502 so the person sees "o Mercado
 * Pago recusou…" instead of a generic server error, and the log keeps the
 * details (an invalid token shows up here as 401/403).
 */
async function mpCall<T>(what: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[billing] Mercado Pago: ${what} failed`, err);
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'erro desconhecido';
    throw new ApiError(502, `O Mercado Pago recusou o pedido (${message}). Confira o MP_ACCESS_TOKEN.`);
  }
}

function mpClient(): MercadoPagoConfig {
  if (!billingEnv.mpAccessToken) {
    throw new ApiError(503, 'Os pagamentos ainda não foram configurados neste servidor (MP_ACCESS_TOKEN).');
  }
  return new MercadoPagoConfig({
    accessToken: billingEnv.mpAccessToken,
    options: { timeout: 10000 },
  });
}

/**
 * Opens a Checkout Pro preference for one period of access and returns the
 * URL to send the person to. Mercado Pago shows Pix, cartão and boleto there
 * and comes back to /assinatura with the payment id in the query string.
 */
export async function createCheckout(user: UserDocument, appUrl: string): Promise<{ url: string }> {
  const preference = new Preference(mpClient());
  const price = Math.round(billingEnv.priceMonthly * 100) / 100;
  const isHttps = appUrl.startsWith('https://');

  const result = await mpCall('create preference', () =>
    preference.create({
      body: {
        items: [
          {
            id: 'gestorfinance-acesso',
            title: `GestorFinance — ${billingEnv.periodDays} dias de acesso`,
            description: 'Clientes, tarefas e finanças em um só lugar',
            category_id: 'services',
            quantity: 1,
            unit_price: price,
            currency_id: 'BRL',
          },
        ],
        payer: { email: user.email, name: user.name },
        external_reference: String(user._id),
        metadata: { user_id: String(user._id) },
        back_urls: {
          success: `${appUrl}/assinatura?status=success`,
          pending: `${appUrl}/assinatura?status=pending`,
          failure: `${appUrl}/assinatura?status=failure`,
        },
        // Mercado Pago only accepts auto_return with a public https return URL.
        ...(isHttps ? { auto_return: 'approved' } : {}),
        notification_url: isHttps ? `${appUrl}/api/billing/webhook` : undefined,
        payment_methods: { installments: 1 },
        statement_descriptor: 'GESTORFINANCE',
      },
    })
  );

  const url = result.init_point ?? result.sandbox_init_point;
  if (!url) throw new ApiError(502, 'O Mercado Pago não devolveu o link de pagamento.');
  return { url };
}

/**
 * Fetches a payment straight from Mercado Pago and, if approved, extends the
 * owner's access — once. Both the webhook and the return page call this, in
 * any order, any number of times.
 */
export async function applyPaymentById(
  providerPaymentId: string
): Promise<{ status: string; userId?: string }> {
  const payment = await mpCall('get payment', () => new MpPayment(mpClient()).get({ id: providerPaymentId }));
  const status = payment.status ?? 'unknown';
  const userId =
    payment.external_reference || (payment.metadata as { user_id?: string } | undefined)?.user_id;

  if (!userId) return { status };

  const record = await Payment.findOneAndUpdate(
    { providerPaymentId },
    {
      $setOnInsert: { userId, providerPaymentId },
      $set: {
        status,
        amount: payment.transaction_amount,
        method: payment.payment_type_id,
      },
    },
    { upsert: true, new: true }
  );

  if (status !== 'approved' || record.appliedAt) return { status, userId };

  const user = await User.findById(userId);
  if (!user) return { status, userId };

  // Days never go to waste: a payment made mid-trial (or before the previous
  // period ends) starts counting when the current access would have ended.
  const now = Date.now();
  const start = new Date(Math.max(now, user.paidUntil?.getTime() ?? 0, user.trialEndsAt?.getTime() ?? 0));
  const end = new Date(start.getTime() + billingEnv.periodDays * DAY_MS);

  user.paidUntil = end;
  user.lastPaymentAt = new Date();
  await user.save();

  record.appliedAt = new Date();
  record.periodStart = start;
  record.periodEnd = end;
  await record.save();

  return { status, userId };
}

/**
 * Checks the `x-signature` header the way Mercado Pago documents it:
 * HMAC-SHA256 over `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
 * Skipped when no secret is configured — the payment is still fetched from
 * Mercado Pago itself, so a forged call can at most make us look one up.
 */
export function verifyWebhookSignature(req: Request, dataId: string): boolean {
  const secret = billingEnv.mpWebhookSecret;
  if (!secret) return true;

  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  if (typeof signature !== 'string' || typeof requestId !== 'string') return false;

  const parts = Object.fromEntries(
    signature.split(',').map((part) => {
      const [key, ...rest] = part.split('=');
      return [key?.trim(), rest.join('=').trim()];
    })
  ) as { ts?: string; v1?: string };
  if (!parts.ts || !parts.v1) return false;

  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Pulls the payment id out of either notification format Mercado Pago sends. */
export function extractWebhookPaymentId(req: Request): string | undefined {
  const query = req.query as Record<string, unknown>;
  const body = (req.body ?? {}) as {
    type?: string;
    action?: string;
    data?: { id?: string | number };
  };

  const type = (query.type as string | undefined) ?? (query.topic as string | undefined) ?? body.type;
  const isPayment = !type || type === 'payment' || body.action?.startsWith('payment.');
  if (!isPayment) return undefined;

  const fromQuery = (query['data.id'] as string | undefined) ?? (query.id as string | undefined);
  const fromBody = body.data?.id !== undefined ? String(body.data.id) : undefined;
  return fromQuery ?? fromBody;
}
