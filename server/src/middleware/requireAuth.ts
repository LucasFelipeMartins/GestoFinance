import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }
  return req.cookies?.token as string | undefined;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  // Web uses the httpOnly cookie; the native (Capacitor) app uses a Bearer
  // token instead, since cross-site cookies from a WebView are unreliable.
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Sessão não encontrada. Faça login novamente.');
  }
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    throw ApiError.unauthorized('Sessão inválida ou expirada. Faça login novamente.');
  }
}
