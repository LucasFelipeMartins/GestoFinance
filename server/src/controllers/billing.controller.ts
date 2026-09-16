import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { resolveAppUrl } from '../utils/appUrl';
import {
  computeAccess,
  ensureTrial,
  createCheckout,
  createSubscription,
  syncSubscription,
  applyPaymentById,
  applyAuthorizedPayment,
  previewCancellation,
  cancelPlan,
  extractWebhookEvent,
  verifyWebhookSignature,
} from '../services/billing';

async function loadUser(req: Request) {
  const user = req.user ?? (await User.findById(req.userId));
  if (!user) throw ApiError.unauthorized();
  await ensureTrial(user);
  return user;
}

/** Access plus what the plan page needs on top: subscription state and the cancel preview. */
async function fullAccess(req: Request) {
  const user = await loadUser(req);
  const access = await computeAccess(user);
  return { ...access, cancelPreview: await previewCancellation(user) };
}

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  res.json({ access: await fullAccess(req) });
});

function assertPayable(reason: string) {
  if (reason === 'admin' || reason === 'free') {
    throw ApiError.badRequest('Sua conta é gratuita — não há nada a pagar.');
  }
}

/** Pix / boleto: one period, no renewal. */
export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const user = await loadUser(req);
  assertPayable((await computeAccess(user)).reason);
  const { url } = await createCheckout(user, resolveAppUrl(req));
  res.json({ url });
});

const subscribeSchema = z.object({
  /** One-shot card token from Mercado Pago's Brick — never the card itself. */
  cardTokenId: z.string().trim().min(8, 'Cartão não informado.').max(128),
});

/** Card: subscription that renews every period until cancelled. */
export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const { cardTokenId } = subscribeSchema.parse(req.body);
  const user = await loadUser(req);
  assertPayable((await computeAccess(user)).reason);
  const result = await createSubscription(user, cardTokenId, resolveAppUrl(req));
  res.json({
    subscriptionStatus: result.status,
    paymentsApplied: result.applied,
    access: await fullAccess(req),
  });
});

const confirmSchema = z.object({
  paymentId: z.string().trim().min(1, 'Pagamento não informado.').max(64),
});

/**
 * Called by the plan page when Mercado Pago sends the person back. It is the
 * belt to the webhook's braces: access is released even if the notification
 * is delayed or never configured.
 */
export const confirm = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId } = confirmSchema.parse(req.body);
  const user = await loadUser(req);

  const result = await applyPaymentById(paymentId);
  if (result.userId && result.userId !== String(user._id)) {
    throw ApiError.forbidden('Este pagamento pertence a outra conta.');
  }
  if (result.status === 'amount_mismatch') {
    throw ApiError.badRequest(
      'O valor pago não corresponde ao plano, por isso o acesso não foi liberado. Fale com o suporte informando o número do pagamento.'
    );
  }

  res.json({ paymentStatus: result.status, access: await fullAccess(req) });
});

const confirmSubscriptionSchema = z.object({
  preapprovalId: z.string().trim().min(1, 'Assinatura não informada.').max(64),
});

/** Back from the card authorisation page. */
export const confirmSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { preapprovalId } = confirmSubscriptionSchema.parse(req.body);
  const user = await loadUser(req);

  const result = await syncSubscription(preapprovalId);
  if (result.userId && result.userId !== String(user._id)) {
    throw ApiError.forbidden('Esta assinatura pertence a outra conta.');
  }

  res.json({
    subscriptionStatus: result.status,
    paymentsApplied: result.applied,
    access: await fullAccess(req),
  });
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const user = await loadUser(req);
  const result = await cancelPlan(user);
  res.json({ result, access: await fullAccess(req) });
});

/**
 * Mercado Pago's notification. Always answers 200 quickly — Mercado Pago
 * retries anything else, and a bad id just means there's nothing to apply.
 */
export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const event = extractWebhookEvent(req);
  if (!event) {
    res.status(200).json({ ignored: true });
    return;
  }
  if (!verifyWebhookSignature(req, event.id)) {
    res.status(401).json({ message: 'Assinatura do webhook inválida.' });
    return;
  }

  try {
    const result =
      event.topic === 'payment'
        ? await applyPaymentById(event.id)
        : event.topic === 'subscription_preapproval'
          ? await syncSubscription(event.id)
          : await applyAuthorizedPayment(event.id);
    res.status(200).json({ ok: true, topic: event.topic, status: result.status });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[billing] webhook ${event.topic}/${event.id} failed`, err);
    res.status(200).json({ ok: false });
  }
});
