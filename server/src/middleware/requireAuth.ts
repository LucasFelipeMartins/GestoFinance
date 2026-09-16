import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { User, UserDocument } from '../models/User';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      /** Loaded by requireAuth so later middlewares/controllers don't re-query. */
      user?: UserDocument;
    }
  }
}

/** Production uses the __Host- prefix: Secure, Path=/ and no Domain are then
 * enforced by the browser itself, so a subdomain can't plant a cookie. */
export const AUTH_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-token' : 'token';

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }
  const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
  return cookies[AUTH_COOKIE] ?? cookies.token;
}

/**
 * Web uses the httpOnly cookie; the native app uses a Bearer token instead,
 * since cross-site cookies from a WebView are unreliable. Besides the
 * signature, the token's session version has to match the account's — that
 * is what lets a password reset invalidate every other device.
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Sessão não encontrada. Faça login novamente.');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Sessão inválida ou expirada. Faça login novamente.');
  }

  const user = await User.findById(payload.userId);
  if (!user || (user.sessionVersion ?? 0) !== payload.sv) {
    throw ApiError.unauthorized('Sessão encerrada. Faça login novamente.');
  }

  req.userId = String(user._id);
  req.user = user;
  next();
});
