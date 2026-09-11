import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  requestRegisterCode,
  register,
  login,
  logout,
  me,
  forgotPassword,
  checkResetToken,
  resetPassword,
  changePassword,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

// Anything that sends an e-mail gets a tighter budget: each hit costs a
// real message, and a flood would burn the provider's quota (or somebody's
// inbox) long before it exhausted the general limiter above.
const mailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitos e-mails pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.' },
});

router.post('/register/request-code', mailLimiter, requestRegisterCode);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

router.post('/forgot-password', mailLimiter, forgotPassword);
router.get('/reset-password', authLimiter, checkResetToken);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/change-password', requireAuth, authLimiter, changePassword);

export default router;
