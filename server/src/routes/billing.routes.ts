import { Router } from 'express';
import { createLimiter } from '../middleware/rateLimit';
import {
  getStatus,
  checkout,
  subscribe,
  confirm,
  confirmSubscription,
  cancel,
} from '../controllers/billing.controller';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// Each of these costs a round-trip to Mercado Pago; nobody legitimately
// opens more than a handful of checkouts or confirmations in a quarter hour.
const mpLimiter = createLimiter({
  name: 'billing-ip',
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
});

router.get('/status', requireAuth, getStatus);
router.post('/checkout', requireAuth, mpLimiter, checkout);
router.post('/subscribe', requireAuth, mpLimiter, subscribe);
router.post('/confirm', requireAuth, mpLimiter, confirm);
router.post('/confirm-subscription', requireAuth, mpLimiter, confirmSubscription);
router.post('/cancel', requireAuth, mpLimiter, cancel);
// The webhook itself is mounted in app.ts (it needs the raw body).

export default router;
