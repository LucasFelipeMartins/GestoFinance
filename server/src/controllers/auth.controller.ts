import { Request, Response } from 'express';
import { User, UserDocument } from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { AUTH_COOKIE } from '../middleware/requireAuth';
import {
  requestRegisterCodeSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validators';
import { env, mailProvider } from '../config/env';
import { resolveAppUrl } from '../utils/appUrl';
import { sendMail, registrationCodeEmail, passwordResetEmail } from '../services/mail';
import { computeAccess, ensureTrial } from '../services/billing';
import { billingEnv } from '../config/env';
import {
  issueRegistrationCode,
  consumeRegistrationCode,
  issueResetToken,
  peekResetToken,
  consumeResetToken,
  REGISTER_CODE_MINUTES,
  RESET_LINK_MINUTES,
} from '../services/verification';

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: COOKIE_MAX_AGE_MS });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, cookieOptions);
  // Sessions from before the __Host- rename still carry the old name.
  if (AUTH_COOKIE !== 'token') res.clearCookie('token', cookieOptions);
}

function issueSession(user: UserDocument): string {
  return signToken({ userId: String(user._id), sv: user.sessionVersion ?? 0 });
}

/**
 * Browsers get the httpOnly cookie and nothing else; the token only goes in
 * the body for clients that can't use cookies (the mobile app), which don't
 * send an Origin header. Keeps the token out of reach of page scripts.
 */
function bodyToken(req: Request, token: string): { token?: string } {
  const origin = req.headers.origin;
  const NATIVE_ORIGINS = new Set(['capacitor://localhost', 'https://localhost']);
  const isBrowser = Boolean(origin) && !NATIVE_ORIGINS.has(origin ?? '');
  return isBrowser ? {} : { token };
}

/**
 * bcrypt work for a non-existent account too, so "wrong password" and
 * "no such e-mail" take the same time and can't be told apart by a clock.
 */
const DUMMY_HASH = '$2a$12$GoGZ9wr7S0d/schIJkHTieef2r1SXwf8k772X05iIpP222yJYpygC';

function toPublicUser(user: { _id: unknown; name: string; email: string; avatarUrl?: string }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}

/** The public user plus what the client needs to gate the app on the plan. */
async function toSessionUser(user: UserDocument) {
  await ensureTrial(user);
  return { ...toPublicUser(user), access: await computeAccess(user) };
}

/* ------------------------------------------------------------------ */
/* Sign-up (two steps: code by e-mail, then the account)               */
/* ------------------------------------------------------------------ */

export const requestRegisterCode = asyncHandler(async (req: Request, res: Response) => {
  const data = requestRegisterCodeSchema.parse(req.body);

  const existing = await User.findOne({ email: data.email }).lean();
  if (existing) {
    throw ApiError.conflict('Este e-mail já está cadastrado. Entre com sua senha ou use "Esqueci minha senha".');
  }

  const code = await issueRegistrationCode(data.email);
  await sendMail(registrationCodeEmail({ to: data.email, name: data.name, code, minutes: REGISTER_CODE_MINUTES }));

  res.json({
    message: `Enviamos um código de confirmação para ${data.email}.`,
    expiresInMinutes: REGISTER_CODE_MINUTES,
    // Local development without a mail provider: the code is also printed to
    // the server console, but handing it to the UI saves a trip there. Never
    // present when a real provider is configured or in production.
    ...(mailProvider() === 'console' ? { devCode: code } : {}),
  });
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw ApiError.conflict('Este e-mail já está cadastrado.');
  }

  // The code must be checked before anything is written — a wrong guess
  // must not leave a half-created account behind.
  await consumeRegistrationCode(data.email, data.code);

  const passwordHash = await hashPassword(data.password);
  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash,
    emailVerifiedAt: new Date(),
    trialEndsAt: new Date(Date.now() + billingEnv.trialDays * 24 * 60 * 60 * 1000),
  });

  const token = issueSession(user);
  setAuthCookie(res, token);

  // The cookie is what web relies on; `token` is for the native app, which
  // stores it itself and sends it back as an Authorization: Bearer header.
  res.status(201).json({ user: await toSessionUser(user), ...bodyToken(req, token) });
});

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);

  const user = await User.findOne({ email: data.email });
  const valid = await comparePassword(data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    throw ApiError.unauthorized('E-mail ou senha incorretos.');
  }

  const token = issueSession(user);
  setAuthCookie(res, token);

  res.json({ user: await toSessionUser(user), ...bodyToken(req, token) });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw ApiError.unauthorized();
  }
  res.json({ user: await toSessionUser(user) });
});

/* ------------------------------------------------------------------ */
/* Password reset (forgot) and change (logged in)                      */
/* ------------------------------------------------------------------ */

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const data = forgotPasswordSchema.parse(req.body);

  // Same answer whether or not the address exists: the response must not
  // double as a way to probe which e-mails have an account.
  const message = `Se ${data.email} estiver cadastrado, você receberá um link para criar uma nova senha em instantes.`;

  const user = await User.findOne({ email: data.email }).lean();
  if (!user) {
    res.json({ message, expiresInMinutes: RESET_LINK_MINUTES });
    return;
  }

  const token = await issueResetToken(data.email);
  const link = `${resolveAppUrl(req)}/redefinir-senha?token=${token}`;
  await sendMail(passwordResetEmail({ to: data.email, name: user.name, link, minutes: RESET_LINK_MINUTES }));

  res.json({
    message,
    expiresInMinutes: RESET_LINK_MINUTES,
    ...(mailProvider() === 'console' ? { devLink: link } : {}),
  });
});

/** Lets the reset page say "link expirado" up front instead of after typing. */
export const checkResetToken = asyncHandler(async (req: Request, res: Response) => {
  const token = String(req.query.token ?? '').trim();
  if (!token) throw ApiError.badRequest('Link inválido.');

  const found = await peekResetToken(token);
  if (!found) {
    throw ApiError.badRequest('Este link expirou ou já foi usado. Peça um novo link de redefinição.');
  }
  res.json({ valid: true, email: found.email });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const data = resetPasswordSchema.parse(req.body);

  const email = await consumeResetToken(data.token);
  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError.badRequest('Conta não encontrada para este link.');
  }

  user.passwordHash = await hashPassword(data.password);
  // Every existing session — on this browser or any other device — belonged
  // to whoever held the old password. Bumping the version ends them all.
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  await user.save();

  clearAuthCookie(res);
  res.json({ message: 'Senha redefinida com sucesso. Entre com a nova senha.' });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const data = changePasswordSchema.parse(req.body);

  const user = await User.findById(req.userId);
  if (!user) throw ApiError.unauthorized();

  const valid = await comparePassword(data.currentPassword, user.passwordHash);
  if (!valid) {
    throw ApiError.badRequest('Senha atual incorreta.', { currentPassword: 'Senha atual incorreta.' });
  }
  if (data.currentPassword === data.newPassword) {
    throw ApiError.badRequest('A nova senha precisa ser diferente da atual.', {
      newPassword: 'A nova senha precisa ser diferente da atual.',
    });
  }

  user.passwordHash = await hashPassword(data.newPassword);
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  await user.save();

  // Other devices are signed out; this one gets a fresh session so the
  // person isn't kicked out of the page they are on.
  const token = issueSession(user);
  setAuthCookie(res, token);
  res.json({ message: 'Senha alterada com sucesso. Outros aparelhos conectados foram desconectados.', ...bodyToken(req, token) });
});
