import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  /** User.sessionVersion at sign time — a mismatch means "signed out everywhere". */
  sv: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  // Pinning the algorithm rules out any "alg confusion" games with the header.
  const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  if (typeof decoded !== 'object' || !decoded || typeof decoded.userId !== 'string') {
    throw new Error('malformed token');
  }
  return { userId: decoded.userId, sv: typeof decoded.sv === 'number' ? decoded.sv : 0 };
}
