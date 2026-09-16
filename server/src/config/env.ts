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
  clientOrigins: (process.env.CLIENT_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    // The native app's fake origins, plus the Vite dev server — the latter
    // only outside production, where a page on someone's own localhost must
    // not be able to call the live API with the person's cookie.
    .concat(
      (process.env.NODE_ENV ?? 'development') === 'production'
        ? ['https://localhost', 'capacitor://localhost']
        : ['https://localhost', 'capacitor://localhost', 'http://localhost', 'http://localhost:5173']
    ),
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
  /**
   * The webhook "Assinatura secreta" shown in the Mercado Pago panel.
   * Mandatory in production once billing is on: without it notifications
   * are refused (see verifyWebhookSignature).
   */
  mpWebhookSecret: optional('MP_WEBHOOK_SECRET'),
  /** What one period costs, in BRL. */
  priceMonthly: Number(process.env.PLAN_PRICE_BRL ?? 11.9),
  /** Days of access each payment buys. */
  periodDays: Number(process.env.PLAN_PERIOD_DAYS ?? 30),
  /** Free days every new account starts with. */
  trialDays: Number(process.env.TRIAL_DAYS ?? 7),
  /**
   * Development only: with test credentials Mercado Pago demands that the
   * subscription's payer be a test account, so the test buyer's e-mail
   * replaces the real one when creating subscriptions. Ignored in production.
   */
  testPayerEmail:
    (process.env.NODE_ENV ?? 'development') === 'production' ? undefined : optional('MP_TEST_PAYER_EMAIL'),
  /** Comma-separated. Admins never pay and can grant free access to others. */
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
};

if (env.isProduction && !env.appUrl) {
  // eslint-disable-next-line no-console
  console.error('[env] APP_URL não definido: os links dos e-mails usarão o Host da requisição.');
}

if (env.isProduction && billingEnv.mpAccessToken && !billingEnv.mpWebhookSecret) {
  // eslint-disable-next-line no-console
  console.error(
    '[billing] MP_WEBHOOK_SECRET não definido: as notificações do Mercado Pago serão recusadas (401) até configurá-lo.'
  );
}

export type MailProvider = 'resend' | 'smtp' | 'console' | 'none';

/** Which channel sendMail will actually use with the current env. */
export function mailProvider(): MailProvider {
  if (env.mail.resendApiKey) return 'resend';
  if (env.mail.smtp.host && env.mail.smtp.user && env.mail.smtp.pass) return 'smtp';
  return env.isProduction ? 'none' : 'console';
}
