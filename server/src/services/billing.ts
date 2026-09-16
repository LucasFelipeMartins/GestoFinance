import { createHmac, timingSafeEqual } from 'crypto';
import { MercadoPagoConfig, Preference, PreApproval, PaymentRefund, Payment as MpPayment } from 'mercadopago';
import { Request } from 'express';
import { Types } from 'mongoose';
import { User, UserDocument } from '../models/User';
import { FreeAccount, Payment, PaymentDocument } from '../models/Billing';
import { billingEnv, env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { sendMail, manualRefundEmail } from './mail';

const DAY_MS = 24 * 60 * 60 * 1000;

export type AccessReason = 'admin' | 'free' | 'paid' | 'trial' | 'expired';

/** The card subscription, as the plan page shows it. */
export interface SubscriptionInfo {
  /** pending | authorized | paused | cancelled */
  status: string;
  nextChargeAt?: string;
  cancelledAt?: string;
}

/** What "cancelar plano" would do right now — shown before the person confirms. */
export interface CancelPreview {
  /** A card subscription that would stop renewing. */
  subscription?: { accessUntil?: string };
  /** Pix periods not fully used, refunded pro rata. */
  refund?: { total: number; unusedDays: number; items: { paymentId: string; amount: number }[] };
  /** Whether access ends immediately (Pix refund) or at the period end (card/boleto). */
  endsNow: boolean;
  /** Nothing to cancel: no subscription and no refundable period. */
  nothing: boolean;
  accessUntil?: string;
}

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
  /** Mercado Pago public key for the in-page card form; absent = card unavailable. */
  mpPublicKey?: string;
  subscription?: SubscriptionInfo;
  cancelPreview?: CancelPreview;
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

const LIVE_SUBSCRIPTION = new Set(['pending', 'authorized', 'paused']);

export function describeSubscription(user: UserDocument): SubscriptionInfo | undefined {
  if (!user.subscriptionId || !user.subscriptionStatus) return undefined;
  return {
    status: user.subscriptionStatus,
    cancelledAt: user.subscriptionCancelledAt?.toISOString(),
    nextChargeAt:
      user.subscriptionStatus === 'authorized'
        ? (user.subscriptionNextChargeAt ?? user.paidUntil)?.toISOString()
        : undefined,
  };
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
    mpPublicKey: billingEnv.mpPublicKey,
    subscription: describeSubscription(user),
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
    // Our own errors (e.g. "token não configurado") already read well.
    if (err instanceof ApiError) throw err;
    // eslint-disable-next-line no-console
    console.error(`[billing] Mercado Pago: ${what} failed`, err);
    throw new ApiError(
      502,
      `O Mercado Pago recusou o pedido (${mpMessage(err)}). Confira o MP_ACCESS_TOKEN.`
    );
  }
}

function mpMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; cause?: { description?: string }[] };
    const cause = Array.isArray(e.cause)
      ? e.cause
          .map((c) => c?.description)
          .filter(Boolean)
          .join('; ')
      : '';
    if (cause) return cause;
    if ('message' in e) return String(e.message);
  }
  return 'erro desconhecido';
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

function price(): number {
  return Math.round(billingEnv.priceMonthly * 100) / 100;
}

/**
 * One period paid up front with Pix or boleto (Checkout Pro). Cards are left
 * out on purpose: paying by card means the subscription below, which renews
 * itself — that is the promise the plan page makes for each method.
 */
export async function createCheckout(user: UserDocument, appUrl: string): Promise<{ url: string }> {
  const preference = new Preference(mpClient());
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
            unit_price: price(),
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
        payment_methods: {
          installments: 1,
          excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'prepaid_card' }],
        },
        statement_descriptor: 'GESTORFINANCE',
      },
    })
  );

  const url = result.init_point ?? result.sandbox_init_point;
  if (!url) throw new ApiError(502, 'O Mercado Pago não devolveu o link de pagamento.');
  return { url };
}

/**
 * The card subscription (Mercado Pago "assinatura"/preapproval). The card is
 * typed on our own page (Mercado Pago's Card Payment Brick, which never
 * hands us the number — only a one-shot `card_token_id`), and the
 * subscription is created already authorised: Mercado Pago charges the
 * first period right away and then one period every month until cancelled.
 * Every charge arrives as a normal `payment` notification and extends
 * access like any other payment.
 *
 * Doing it this way, instead of sending the person to Mercado Pago's
 * subscription page, avoids the requirement there that the buyer log into a
 * Mercado Pago account with exactly the same e-mail as our account.
 */
export async function createSubscription(
  user: UserDocument,
  cardTokenId: string,
  appUrl: string
): Promise<{ id: string; status: string; applied: number; nextChargeAt?: string }> {
  if (user.subscriptionId && user.subscriptionStatus === 'authorized') {
    throw ApiError.badRequest('Sua renovação automática já está ativa.');
  }

  // Charged right away, whenever the person decides to subscribe. Days
  // already owned are not lost: the paid period starts when the trial (or
  // the previous period) would have ended — see grantPeriod.
  const result = await mpCall('create preapproval', () =>
    new PreApproval(mpClient()).create({
      body: {
        reason: `GestorFinance — plano mensal (${billingEnv.periodDays} dias)`,
        external_reference: String(user._id),
        payer_email: billingEnv.testPayerEmail ?? user.email,
        card_token_id: cardTokenId,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: price(),
          currency_id: 'BRL',
        },
        back_url: `${appUrl}/assinatura`,
        status: 'authorized',
      },
    })
  );

  if (!result.id) {
    throw new ApiError(502, 'O Mercado Pago não devolveu a assinatura.');
  }

  user.subscriptionId = result.id;
  user.subscriptionStatus = result.status ?? 'pending';
  user.subscriptionCancelledAt = undefined;
  user.subscriptionNextChargeAt = result.next_payment_date ? new Date(result.next_payment_date) : undefined;
  await user.save();

  // The first charge is usually searchable within seconds; if not yet, the
  // page re-syncs shortly after (and the webhook applies it anyway).
  const applied = result.status === 'authorized' ? await applyRecentPayments(user) : 0;
  return {
    id: result.id,
    status: result.status ?? 'pending',
    applied,
    nextChargeAt: user.subscriptionNextChargeAt?.toISOString(),
  };
}

/**
 * Reads the subscription back from Mercado Pago and mirrors its state on the
 * account. Called from the return page and from the webhook; whichever comes
 * first. Once authorised, any charge already made is applied too.
 */
export async function syncSubscription(
  preapprovalId: string
): Promise<{ status: string; userId?: string; applied: number }> {
  const sub = await mpCall('get preapproval', () => new PreApproval(mpClient()).get({ id: preapprovalId }));
  const status = sub.status ?? 'unknown';

  const user =
    (sub.external_reference && Types.ObjectId.isValid(sub.external_reference)
      ? await User.findById(sub.external_reference)
      : null) ?? (await User.findOne({ subscriptionId: preapprovalId }));
  if (!user) return { status, applied: 0 };

  // A newer subscription replaced this one — don't let a late notification
  // about the old one overwrite the current state.
  if (user.subscriptionId && user.subscriptionId !== preapprovalId && status !== 'authorized') {
    return { status, userId: String(user._id), applied: 0 };
  }

  user.subscriptionId = preapprovalId;
  user.subscriptionStatus = status;
  if (sub.next_payment_date) user.subscriptionNextChargeAt = new Date(sub.next_payment_date);
  if (status === 'cancelled' && !user.subscriptionCancelledAt) user.subscriptionCancelledAt = new Date();
  if (status === 'authorized') user.subscriptionCancelledAt = undefined;
  await user.save();

  let applied = 0;
  if (status === 'authorized') applied = await applyRecentPayments(user);
  return { status, userId: String(user._id), applied };
}

/**
 * Mercado Pago copies the subscription's external_reference (our user id)
 * onto every charge it generates, so the person's recent payments can be
 * found and applied without waiting for each webhook. Idempotent.
 */
async function applyRecentPayments(user: UserDocument): Promise<number> {
  const found = await mpCall('search payments', () =>
    new MpPayment(mpClient()).search({
      options: { external_reference: String(user._id), sort: 'date_created', criteria: 'desc', limit: 10 },
    })
  );
  let applied = 0;
  for (const payment of found.results ?? []) {
    if (!payment.id) continue;
    const before = await Payment.findOne({ providerPaymentId: String(payment.id) }).lean();
    if (before?.appliedAt) continue;
    const result = await applyPaymentById(String(payment.id));
    if (result.status === 'approved') applied += 1;
  }
  return applied;
}

/** `subscription_authorized_payment` notifications: a charge of a subscription. */
export async function applyAuthorizedPayment(
  authorizedPaymentId: string
): Promise<{ status: string; userId?: string }> {
  const client = mpClient();
  const response = await fetch(`https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`, {
    headers: { Authorization: `Bearer ${client.accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    // eslint-disable-next-line no-console
    console.error(`[billing] authorized_payments/${authorizedPaymentId} -> ${response.status}`);
    return { status: 'unknown' };
  }
  const body = (await response.json()) as { payment?: { id?: number | string; status?: string } };
  if (!body.payment?.id) return { status: body.payment?.status ?? 'unknown' };
  return applyPaymentById(String(body.payment.id));
}

const CARD_TYPES = new Set(['credit_card', 'debit_card', 'prepaid_card']);

/** Mercado Pago statuses that take an already-approved payment back. */
const REVOKING_STATUSES = new Set(['refunded', 'charged_back', 'cancelled']);

export type ApplyResult = {
  /** Mercado Pago's status, or `amount_mismatch` when approved but not honoured. */
  status: string;
  userId?: string;
};

type MpPaymentResponse = Awaited<ReturnType<MpPayment['get']>>;

/** Which account a payment belongs to: our reference, or the subscription it came from. */
async function resolvePaymentUser(payment: MpPaymentResponse): Promise<string | undefined> {
  const metadata = (payment.metadata ?? {}) as { user_id?: string; preapproval_id?: string };
  const direct = payment.external_reference || metadata.user_id;
  if (direct && Types.ObjectId.isValid(direct)) return direct;
  if (metadata.preapproval_id) {
    const owner = await User.findOne({ subscriptionId: metadata.preapproval_id }).select('_id').lean();
    if (owner) return String(owner._id);
  }
  return undefined;
}

/**
 * Fetches a payment straight from Mercado Pago and, if approved, extends the
 * owner's access — once. Both the webhook and the return page call this, in
 * any order, any number of times, possibly at the same instant: every step
 * that changes access is a single atomic update guarded by the payment row.
 * A later refund/chargeback notification takes the period back again.
 */
export async function applyPaymentById(providerPaymentId: string): Promise<ApplyResult> {
  const payment = await mpCall('get payment', () => new MpPayment(mpClient()).get({ id: providerPaymentId }));
  const status = payment.status ?? 'unknown';
  const userId = await resolvePaymentUser(payment);

  if (!userId) return { status };

  // Never trust "approved" alone: a payment for R$ 0,01 (or in another
  // currency) created outside our checkout must not buy a period.
  const amount = payment.transaction_amount ?? 0;
  const currency = payment.currency_id ?? 'BRL';
  const priceOk = currency === 'BRL' && amount + 0.005 >= billingEnv.priceMonthly;
  const issue =
    status === 'approved' && !priceOk
      ? `valor ${currency} ${amount} abaixo do plano (BRL ${billingEnv.priceMonthly})`
      : undefined;

  // Subscription charges come through as plain card payments (operation
  // type "regular_payment", empty metadata); cards are only ever used via
  // the subscription in our flow, so a card payment of a subscribed account
  // is a subscription charge.
  const metadata = (payment.metadata ?? {}) as { preapproval_id?: string };
  const isCard = CARD_TYPES.has(payment.payment_type_id ?? '');
  const isRecurring =
    payment.operation_type === 'recurring_payment' ||
    Boolean(metadata.preapproval_id) ||
    (isCard && Boolean(await User.exists({ _id: userId, subscriptionId: { $ne: null } })));

  const record = await Payment.findOneAndUpdate(
    { providerPaymentId },
    {
      $setOnInsert: { userId, providerPaymentId, kind: isRecurring ? 'subscription' : 'single' },
      $set: {
        status,
        amount: payment.transaction_amount,
        method: payment.payment_type_id,
        ...(metadata.preapproval_id ? { preapprovalId: metadata.preapproval_id } : {}),
        ...(issue ? { issue } : {}),
      },
    },
    { upsert: true, new: true }
  );

  if (issue) {
    // eslint-disable-next-line no-console
    console.error(`[billing] payment ${providerPaymentId} not applied: ${issue}`);
    return { status: 'amount_mismatch', userId };
  }

  if (status === 'approved' && !record.appliedAt) {
    await grantPeriod(record.userId, providerPaymentId);
  } else if (REVOKING_STATUSES.has(status) && record.appliedAt && !record.revokedAt) {
    await revokePeriod(record.userId, providerPaymentId);
  }

  return { status, userId };
}

/**
 * Claims the payment row (only one caller wins, no matter how many race) and
 * then pushes `paidUntil` forward in one pipeline update. Days never go to
 * waste: a payment made mid-trial (or before the previous period ends)
 * starts counting when the current access would have ended.
 */
async function grantPeriod(userId: Types.ObjectId, providerPaymentId: string): Promise<void> {
  const claimedAt = new Date();
  const claimed = await Payment.findOneAndUpdate(
    { providerPaymentId, status: 'approved', appliedAt: null },
    { $set: { appliedAt: claimedAt } },
    { new: true }
  );
  if (!claimed) return; // somebody else got here first

  const periodMs = billingEnv.periodDays * DAY_MS;
  const user = await User.findByIdAndUpdate(
    userId,
    [
      { $set: { _accessBase: { $max: [claimedAt, '$paidUntil', '$trialEndsAt'] } } },
      { $set: { paidUntil: { $add: ['$_accessBase', periodMs] }, lastPaymentAt: claimedAt } },
      { $unset: '_accessBase' },
    ],
    { new: true }
  );

  if (!user?.paidUntil) {
    // Account vanished between checkout and payment — release the claim so
    // a retry can apply it if the account comes back.
    await Payment.updateOne({ providerPaymentId }, { $unset: { appliedAt: 1 } });
    return;
  }

  claimed.periodStart = new Date(user.paidUntil.getTime() - periodMs);
  claimed.periodEnd = user.paidUntil;
  await claimed.save();
}

/** Mirror of grantPeriod for refunds/chargebacks: the same period is taken back once. */
async function revokePeriod(userId: Types.ObjectId, providerPaymentId: string): Promise<void> {
  const revokedAt = new Date();
  const claimed = await Payment.findOneAndUpdate(
    { providerPaymentId, appliedAt: { $ne: null }, revokedAt: null },
    { $set: { revokedAt } },
    { new: true }
  );
  if (!claimed) return;

  const periodMs = billingEnv.periodDays * DAY_MS;
  await User.updateOne({ _id: userId, paidUntil: { $ne: null } }, [
    { $set: { paidUntil: { $subtract: ['$paidUntil', periodMs] } } },
  ]);
  // eslint-disable-next-line no-console
  console.warn(
    `[billing] payment ${providerPaymentId} revoked (${claimed.status}); ${periodMs / DAY_MS} days removed`
  );
}

/* ------------------------------------------------------------------ */
/* Cancelling                                                          */
/* ------------------------------------------------------------------ */

/** Mercado Pago payment_type_id values we refund pro rata (Pix and wallet balance). */
const REFUNDABLE_METHODS = new Set(['bank_transfer', 'account_money']);

/** Pix periods still (partly) ahead of us: what would be paid back. */
async function refundablePayments(userId: Types.ObjectId, now: number) {
  const rows = await Payment.find({
    userId,
    status: 'approved',
    appliedAt: { $ne: null },
    revokedAt: null,
    refundStatus: null,
    kind: { $ne: 'subscription' },
    method: { $in: Array.from(REFUNDABLE_METHODS) },
    periodEnd: { $gt: new Date(now) },
  }).sort({ periodEnd: 1 });

  return rows
    .filter((row) => row.amount && row.periodStart && row.periodEnd)
    .map((row) => {
      const start = row.periodStart!.getTime();
      const end = row.periodEnd!.getTime();
      const unusedMs = Math.max(0, end - Math.max(now, start));
      const fraction = unusedMs / (end - start);
      const amount = Math.floor(row.amount! * fraction * 100) / 100;
      return { row, amount, unusedDays: Math.round(unusedMs / DAY_MS) };
    })
    .filter((item) => item.amount >= 0.01);
}

export async function previewCancellation(user: UserDocument): Promise<CancelPreview> {
  const now = Date.now();
  const hasSubscription = Boolean(
    user.subscriptionId && LIVE_SUBSCRIPTION.has(user.subscriptionStatus ?? '')
  );
  const refunds = await refundablePayments(user._id, now);

  const preview: CancelPreview = {
    endsNow: refunds.length > 0,
    nothing: !hasSubscription && refunds.length === 0,
    accessUntil: user.paidUntil?.toISOString(),
  };
  if (hasSubscription) preview.subscription = { accessUntil: user.paidUntil?.toISOString() };
  if (refunds.length > 0) {
    preview.refund = {
      total: Math.round(refunds.reduce((sum, item) => sum + item.amount, 0) * 100) / 100,
      unusedDays: refunds.reduce((sum, item) => sum + item.unusedDays, 0),
      items: refunds.map((item) => ({ paymentId: item.row.providerPaymentId, amount: item.amount })),
    };
  }
  return preview;
}

export interface CancelResult {
  subscriptionCancelled: boolean;
  refunds: { paymentId: string; amount: number; status: string }[];
  /** Total actually refunded through Mercado Pago. */
  refundedNow: number;
  /** Total Mercado Pago refused to refund automatically (owner notified). */
  refundManual: number;
  accessUntil?: string;
}

/**
 * "Cancelar plano":
 *  - card subscription → Mercado Pago stops renewing; what was paid stays
 *    paid, so access runs until the period end (boleto periods likewise:
 *    they never renew and are not refunded);
 *  - Pix periods → the unused days are refunded pro rata and access ends now.
 */
export async function cancelPlan(user: UserDocument): Promise<CancelResult> {
  const now = Date.now();
  const result: CancelResult = { subscriptionCancelled: false, refunds: [], refundedNow: 0, refundManual: 0 };

  if (user.subscriptionId && LIVE_SUBSCRIPTION.has(user.subscriptionStatus ?? '')) {
    await mpCall('cancel preapproval', () =>
      new PreApproval(mpClient()).update({ id: user.subscriptionId!, body: { status: 'cancelled' } })
    );
    user.subscriptionStatus = 'cancelled';
    user.subscriptionCancelledAt = new Date();
    await user.save();
    result.subscriptionCancelled = true;
  }

  const refunds = await refundablePayments(user._id, now);
  for (const { row, amount } of refunds) {
    const status = await refundPayment(user, row, amount);
    result.refunds.push({ paymentId: row.providerPaymentId, amount, status });
    if (status === 'done') result.refundedNow += amount;
    else result.refundManual += amount;
  }
  result.refundedNow = Math.round(result.refundedNow * 100) / 100;
  result.refundManual = Math.round(result.refundManual * 100) / 100;

  if (refunds.length > 0) {
    // The refunded periods are over. Whatever was paid by card or boleto
    // (never refunded) still counts, so access ends at the latest remaining
    // period — or now, if there is none.
    const remaining = await Payment.find({
      userId: user._id,
      status: 'approved',
      appliedAt: { $ne: null },
      revokedAt: null,
    })
      .sort({ periodEnd: -1 })
      .limit(1)
      .lean();
    const remainingEnd = remaining[0]?.periodEnd?.getTime() ?? 0;
    user.paidUntil = new Date(Math.max(now, remainingEnd));
    await user.save();
  }

  if (!result.subscriptionCancelled && refunds.length === 0) {
    throw ApiError.badRequest('Não há renovação automática ativa nem período a estornar na sua conta.');
  }

  result.accessUntil = user.paidUntil?.toISOString();
  return result;
}

/** Asks Mercado Pago for a (partial) refund; anything it refuses is flagged for the owner. */
async function refundPayment(user: UserDocument, row: PaymentDocument, amount: number): Promise<string> {
  const requestedAt = new Date();
  let status: string;
  let note: string | undefined;

  try {
    const refund = await new PaymentRefund(mpClient()).create({
      payment_id: row.providerPaymentId,
      body: { amount },
      requestOptions: { idempotencyKey: `refund-${row.providerPaymentId}-${Math.round(amount * 100)}` },
    });
    status = refund.status === 'approved' || refund.status === 'in_process' ? 'done' : 'failed';
    note = refund.status ? `Mercado Pago: ${refund.status}` : undefined;
  } catch (err) {
    status = 'manual';
    note = `Mercado Pago recusou o estorno automático: ${mpMessage(err)}`;
    // eslint-disable-next-line no-console
    console.error(`[billing] refund of ${row.providerPaymentId} failed`, err);
  }

  row.refundAmount = amount;
  row.refundStatus = status;
  row.refundRequestedAt = requestedAt;
  row.refundNote = note;
  row.revokedAt = requestedAt; // the period is over either way
  await row.save();

  if (status !== 'done') await notifyManualRefund(user, row, amount, note ?? '');
  return status;
}

async function notifyManualRefund(user: UserDocument, row: PaymentDocument, amount: number, reason: string) {
  for (const admin of billingEnv.adminEmails) {
    try {
      await sendMail(
        manualRefundEmail({
          to: admin,
          userName: user.name,
          userEmail: user.email,
          paymentId: row.providerPaymentId,
          method: row.method ?? 'desconhecido',
          amount,
          reason,
        })
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[billing] could not e-mail the admin about a manual refund', err);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Webhook                                                             */
/* ------------------------------------------------------------------ */

/**
 * Checks the `x-signature` header the way Mercado Pago documents it:
 * HMAC-SHA256 over `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
 * In production the secret is mandatory: without it every notification is
 * refused (the return page still confirms payments, so nobody is locked
 * out — only the automatic path is off until MP_WEBHOOK_SECRET is set).
 * In development it is skipped, since Mercado Pago can't reach localhost.
 */
export function verifyWebhookSignature(req: Request, dataId: string): boolean {
  const secret = billingEnv.mpWebhookSecret;
  if (!secret) return !env.isProduction;

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

export type WebhookTopic = 'payment' | 'subscription_preapproval' | 'subscription_authorized_payment';

/** Pulls topic and id out of either notification format Mercado Pago sends. */
export function extractWebhookEvent(req: Request): { topic: WebhookTopic; id: string } | undefined {
  const query = req.query as Record<string, unknown>;
  const body = (req.body ?? {}) as {
    type?: string;
    action?: string;
    data?: { id?: string | number };
  };

  const rawType = (query.type as string | undefined) ?? (query.topic as string | undefined) ?? body.type;
  let topic: WebhookTopic | undefined;
  if (!rawType || rawType === 'payment' || body.action?.startsWith('payment.')) topic = 'payment';
  else if (rawType === 'subscription_preapproval' || rawType === 'preapproval')
    topic = 'subscription_preapproval';
  else if (rawType === 'subscription_authorized_payment') topic = 'subscription_authorized_payment';
  if (!topic) return undefined;

  const fromQuery = (query['data.id'] as string | undefined) ?? (query.id as string | undefined);
  const fromBody = body.data?.id !== undefined ? String(body.data.id) : undefined;
  const id = fromQuery ?? fromBody;
  return id ? { topic, id } : undefined;
}
