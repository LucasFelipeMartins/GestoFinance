import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getStatus, checkout, confirm } from '../controllers/billing.controller';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// Each of these costs a round-trip to Mercado Pago; nobody legitimately
// opens more than a handful of checkouts or confirmations in a quarter hour.
const mpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' },
});

router.get('/status', requireAuth, getStatus);
router.post('/checkout', requireAuth, mpLimiter, checkout);
router.post('/confirm', requireAuth, mpLimiter, confirm);
// The webhook itself is mounted in app.ts (it needs the raw body).

export default router;
