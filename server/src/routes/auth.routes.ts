import { Router } from 'express';
import { createLimiter } from '../middleware/rateLimit';
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

const QUARTER_HOUR = 15 * 60 * 1000;

const authLimiter = createLimiter({
  name: 'auth-ip',
  windowMs: QUARTER_HOUR,
  limit: 20,
  message: 'Muitas tentativas. Tente novamente em alguns minutos.',
});

// Second line of defence for login: per account, whatever the source IP.
// A botnet spreading guesses over many addresses still gets 10 tries per
// e-mail per window, which is far below the space of any decent password.
const accountEmail = (req: { body?: unknown }) =>
  String((req.body as { email?: unknown } | undefined)?.email ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 254) || 'anon';

const loginAccountLimiter = createLimiter({
  name: 'login-account',
  windowMs: QUARTER_HOUR,
  limit: 10,
  message: 'Muitas tentativas para esta conta. Aguarde 15 minutos ou use "Esqueci minha senha".',
  keyGenerator: accountEmail,
  // Only failures count: signing in normally from several devices must not
  // eat into the budget meant for guessing.
  skipSuccessfulRequests: true,
});

// Anything that sends an e-mail gets a tighter budget: each hit costs a
// real message, and a flood would burn the provider's quota (or somebody's
// inbox) long before it exhausted the general limiter above.
const mailLimiter = createLimiter({
  name: 'mail-ip',
  windowMs: QUARTER_HOUR,
  limit: 6,
  message: 'Muitos e-mails pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.',
});

router.post('/register/request-code', mailLimiter, requestRegisterCode);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, loginAccountLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

router.post('/forgot-password', mailLimiter, forgotPassword);
router.get('/reset-password', authLimiter, checkResetToken);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/change-password', requireAuth, authLimiter, changePassword);

export default router;
