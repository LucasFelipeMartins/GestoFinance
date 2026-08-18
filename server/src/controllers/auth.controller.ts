import { Request, Response } from 'express';
import { User } from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { registerSchema, loginSchema } from '../validators/auth.validators';
import { env } from '../config/env';

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

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw ApiError.conflict('Este e-mail já está cadastrado.');
  }

  const passwordHash = await hashPassword(data.password);
  const user = await User.create({ name: data.name, email: data.email, passwordHash });

  const token = signToken({ userId: String(user._id) });
  setAuthCookie(res, token);

  res.status(201).json({ user: toPublicUser(user) });
});

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

  res.json({ user: toPublicUser(user) });
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
