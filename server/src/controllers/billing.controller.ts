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
  applyPaymentById,
  extractWebhookPaymentId,
  verifyWebhookSignature,
} from '../services/billing';

async function loadUser(userId: string | undefined) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized();
  await ensureTrial(user);
  return user;
}

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await loadUser(req.userId);
  res.json({ access: await computeAccess(user) });
});

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const user = await loadUser(req.userId);
  const access = await computeAccess(user);
  if (access.reason === 'admin' || access.reason === 'free') {
    throw ApiError.badRequest('Sua conta é gratuita — não há nada a pagar.');
  }
  const { url } = await createCheckout(user, resolveAppUrl(req));
  res.json({ url });
});

const confirmSchema = z.object({
  paymentId: z.string().trim().min(1, 'Pagamento não informado.'),
});

/**
 * Called by the plan page when Mercado Pago sends the person back. It is the
 * belt to the webhook's braces: access is released even if the notification
 * is delayed or never configured.
 */
export const confirm = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId } = confirmSchema.parse(req.body);
  const user = await loadUser(req.userId);

  const result = await applyPaymentById(paymentId);
  if (result.userId && result.userId !== String(user._id)) {
    throw ApiError.forbidden('Este pagamento pertence a outra conta.');
  }

  const fresh = await loadUser(req.userId);
  res.json({ paymentStatus: result.status, access: await computeAccess(fresh) });
});

/**
 * Mercado Pago's notification. Always answers 200 quickly — Mercado Pago
 * retries anything else, and a bad id just means there's nothing to apply.
 */
export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const paymentId = extractWebhookPaymentId(req);
  if (!paymentId) {
    res.status(200).json({ ignored: true });
    return;
  }
  if (!verifyWebhookSignature(req, paymentId)) {
    res.status(401).json({ message: 'Assinatura do webhook inválida.' });
    return;
  }

  try {
    const result = await applyPaymentById(paymentId);
    res.status(200).json({ ok: true, status: result.status });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[billing] webhook failed', err);
    res.status(200).json({ ok: false });
  }
});
