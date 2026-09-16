import { Request } from 'express';
import { env } from '../config/env';

/**
 * Where the web app lives, for links inside e-mails. APP_URL wins when set
 * (always, in production). Otherwise the Host that received the request is
 * used — on Vercel that is the deployment itself, and unlike Origin it is
 * not something a caller can choose freely, since a foreign Host would not
 * have been routed here at all.
 */
export function resolveAppUrl(req: Request): string {
  if (env.appUrl) return env.appUrl;

  const host = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim() || req.headers.host;
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
  const proto = forwardedProto ?? req.protocol ?? 'https';

  // Vite dev server proxying /api: the API's host is :4000 but the app is
  // the page that made the request.
  if (!env.isProduction && req.headers.origin && /^https?:\/\/localhost(:\d+)?$/.test(req.headers.origin)) {
    return req.headers.origin;
  }
  return `${proto}://${host ?? 'localhost'}`;
}
