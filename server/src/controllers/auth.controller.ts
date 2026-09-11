import { Request, Response } from 'express';
import { User } from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import {
  requestRegisterCodeSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validators';
import { env, mailProvider } from '../config/env';
import { sendMail, registrationCodeEmail, passwordResetEmail } from '../services/mail';
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

function setAuthCookie(res: Response, token: string): void {
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function toPublicUser(user: { _id: unknown; name: string; email: string; avatarUrl?: string }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Where the web app lives, for links inside e-mails. APP_URL wins when set;
 * otherwise the request itself tells us — the SPA and the API are the same
 * Vercel deployment, so the Origin (or Host, for the native app whose origin
 * is a fake localhost) is exactly the address the user should open.
 */
function resolveAppUrl(req: Request): string {
  if (env.appUrl) return env.appUrl;

  const origin = req.headers.origin;
  const host = req.headers.host ?? 'localhost';
  const isLocalOrigin = !origin || /^(https?|capacitor):\/\/localhost(:\d+)?$/.test(origin);
  const sameOrigin = origin === `https://${host}` || origin === `http://${host}`;

  if (origin && !isLocalOrigin && (sameOrigin || env.clientOrigins.includes(origin))) {
    return origin;
  }
  if (!env.isProduction && origin) {
    // Vite dev server proxying /api — the browser's origin is the app.
    return origin;
  }

  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
  const proto = forwardedProto ?? req.protocol ?? 'https';
  return `${proto}://${host}`;
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
  });

  const token = signToken({ userId: String(user._id) });
  setAuthCookie(res, token);

  // The cookie is what web relies on; `token` is for the native app, which
  // stores it itself and sends it back as an Authorization: Bearer header.
  res.status(201).json({ user: toPublicUser(user), token });
});

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);

  const user = await User.findOne({ email: data.email });
  if (!user) {
    throw ApiError.unauthorized('E-mail ou senha incorretos.');
  }

  const valid = await comparePassword(data.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized('E-mail ou senha incorretos.');
  }

  const token = signToken({ userId: String(user._id) });
  setAuthCookie(res, token);

  res.json({ user: toPublicUser(user), token });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw ApiError.unauthorized();
  }
  res.json({ user: toPublicUser(user) });
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
  await user.save();

  // Any session cookie on this browser belongs to whoever held the old
  // password — drop it so the new one has to be used from here on.
  res.clearCookie('token');
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
  await user.save();

  res.json({ message: 'Senha alterada com sucesso.' });
});
