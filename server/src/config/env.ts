import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  // Comma-separated list: the deployed web origin(s) plus the Capacitor
  // native app's origins (which aren't a real remote domain). Android is
  // configured with androidScheme: 'https' in capacitor.config.ts, so the
  // app's origin is https://localhost, not the capacitor:// scheme.
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .concat(['https://localhost', 'capacitor://localhost', 'http://localhost']),
  /**
   * Public URL of the web app, used to build the links inside e-mails
   * (password reset). Optional: when unset the URL is derived from the
   * request that asked for the e-mail, which on Vercel is the same
   * deployment that serves the SPA — preview URLs included.
   */
  appUrl: optional('APP_URL')?.replace(/\/+$/, ''),
  mongoUrl: required('MONGO_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  maxAvatarSizeMb: Number(process.env.MAX_AVATAR_SIZE_MB ?? 5),
  // When set (production on Vercel), avatars upload to Vercel Blob instead of
  // local disk, which doesn't persist across serverless invocations.
  blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN,

  /**
   * Outgoing e-mail (verification codes, password reset). Two providers are
   * supported; the first one configured wins:
   *   1. Resend — just RESEND_API_KEY (HTTP API, works anywhere incl. Vercel).
   *   2. Any SMTP server — SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS
   *      (Gmail with an app password, Brevo, Mailgun...).
   * With neither set, development logs the message to the console instead of
   * sending it, so the flow can be exercised locally without an account.
   */
  mail: {
    from: optional('MAIL_FROM'),
    resendApiKey: optional('RESEND_API_KEY'),
    smtp: {
      host: optional('SMTP_HOST'),
      port: Number(process.env.SMTP_PORT ?? 587),
      user: optional('SMTP_USER'),
      pass: optional('SMTP_PASS'),
      // Port 465 is implicit TLS; 587/25 negotiate STARTTLS instead.
      secure: (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || process.env.SMTP_PORT === '465',
    },
  },
};

export const billingEnv = {
  /** Mercado Pago "Access Token" (Produção ou Teste) from the developer panel. */
  mpAccessToken: optional('MP_ACCESS_TOKEN'),
  /** Optional: the webhook "Assinatura secreta" shown in the Mercado Pago panel. */
  mpWebhookSecret: optional('MP_WEBHOOK_SECRET'),
  /** What one period costs, in BRL. */
  priceMonthly: Number(process.env.PLAN_PRICE_BRL ?? 11.9),
  /** Days of access each payment buys. */
  periodDays: Number(process.env.PLAN_PERIOD_DAYS ?? 30),
  /** Free days every new account starts with. */
  trialDays: Number(process.env.TRIAL_DAYS ?? 7),
  /** Comma-separated. Admins never pay and can grant free access to others. */
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
};

export type MailProvider = 'resend' | 'smtp' | 'console' | 'none';

/** Which channel sendMail will actually use with the current env. */
export function mailProvider(): MailProvider {
  if (env.mail.resendApiKey) return 'resend';
  if (env.mail.smtp.host && env.mail.smtp.user && env.mail.smtp.pass) return 'smtp';
  return env.isProduction ? 'none' : 'console';
}
