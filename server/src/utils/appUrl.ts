import { Request } from 'express';
import { env } from '../config/env';

/**
 * Where the web app lives, for links inside e-mails. APP_URL wins when set;
 * otherwise the request itself tells us — the SPA and the API are the same
 * Vercel deployment, so the Origin (or Host, for the native app whose origin
 * is a fake localhost) is exactly the address the user should open.
 */
export function resolveAppUrl(req: Request): string {
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
