import { Router } from 'express';
import { getStatus, checkout, confirm } from '../controllers/billing.controller';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/status', requireAuth, getStatus);
router.post('/checkout', requireAuth, checkout);
router.post('/confirm', requireAuth, confirm);
// The webhook itself is mounted in app.ts (it needs the raw body).

export default router;
