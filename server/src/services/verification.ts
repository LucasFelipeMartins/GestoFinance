import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { EmailVerification, VerificationPurpose } from '../models/EmailVerification';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

/** How long a registration code stays valid. */
export const REGISTER_CODE_MINUTES = 15;
/** How long a password-reset link stays valid. */
export const RESET_LINK_MINUTES = 30;
/** Digits in the e-mailed sign-up code. */
export const REGISTER_CODE_LENGTH = 5;
/** Wrong guesses allowed before a code is discarded. Five digits with five
 * tries is a 1-in-20.000 shot per code; with the 60 s resend cooldown and
 * the per-IP/per-account limiters that is far out of brute-force reach. */
const MAX_ATTEMPTS = 5;
/** Minimum gap between two e-mails for the same address and purpose. */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * HMAC rather than bcrypt: these secrets are short-lived and attempt-limited,
 * so the slow hash buys nothing, and a keyed hash keeps a leaked table
 * useless without the server secret.
 */
function hashSecret(secret: string): string {
  return createHmac('sha256', env.jwtSecret).update(secret).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

async function assertCooldown(email: string, purpose: VerificationPurpose): Promise<void> {
  const existing = await EmailVerification.findOne({ email, purpose }).lean();
  if (!existing) return;
  const elapsed = (Date.now() - new Date(existing.createdAt).getTime()) / 1000;
  if (elapsed < RESEND_COOLDOWN_SECONDS) {
    const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
    throw new ApiError(429, `Já enviamos um e-mail há pouco. Aguarde ${wait}s para pedir outro.`);
  }
}

/**
 * Creates (or replaces) the registration code for an e-mail and returns the
 * plain code so the caller can send it. Never stored in clear.
 */
export async function issueRegistrationCode(email: string): Promise<string> {
  await assertCooldown(email, 'register');

  const code = String(randomInt(0, 10 ** REGISTER_CODE_LENGTH)).padStart(REGISTER_CODE_LENGTH, '0');
  await EmailVerification.findOneAndUpdate(
    { email, purpose: 'register' },
    {
      tokenHash: hashSecret(code),
      expiresAt: new Date(Date.now() + REGISTER_CODE_MINUTES * 60 * 1000),
      attempts: 0,
      createdAt: new Date(),
    },
    { upsert: true }
  );
  return code;
}

/**
 * Checks a registration code. On success the record is removed, so the same
 * code can't be replayed to open a second account.
 */
export async function consumeRegistrationCode(email: string, code: string): Promise<void> {
  const record = await EmailVerification.findOne({ email, purpose: 'register' });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    if (record) await record.deleteOne();
    throw ApiError.badRequest('Código expirado ou não encontrado. Peça um novo código.', {
      code: 'Código expirado ou não encontrado.',
    });
  }

  if (!safeEqual(record.tokenHash, hashSecret(code))) {
    record.attempts += 1;
    if (record.attempts >= MAX_ATTEMPTS) {
      await record.deleteOne();
      throw ApiError.badRequest('Muitas tentativas erradas. Peça um novo código.', {
        code: 'Muitas tentativas. Peça um novo código.',
      });
    }
    await record.save();
    const left = MAX_ATTEMPTS - record.attempts;
    throw ApiError.badRequest('Código incorreto.', {
      code: `Código incorreto. ${left} tentativa${left === 1 ? '' : 's'} restante${left === 1 ? '' : 's'}.`,
    });
  }

  await record.deleteOne();
}

/**
 * Creates (or replaces) the password-reset token for an e-mail and returns
 * the plain token to embed in the link. 32 random bytes — not guessable, so
 * no attempt counter is needed; expiry and single use are the safeguards.
 */
export async function issueResetToken(email: string): Promise<string> {
  await assertCooldown(email, 'reset');

  const token = randomBytes(32).toString('hex');
  await EmailVerification.findOneAndUpdate(
    { email, purpose: 'reset' },
    {
      tokenHash: hashSecret(token),
      expiresAt: new Date(Date.now() + RESET_LINK_MINUTES * 60 * 1000),
      attempts: 0,
      createdAt: new Date(),
    },
    { upsert: true }
  );
  return token;
}

/** Looks a reset token up without consuming it — lets the reset page tell
 * an expired link apart from a valid one before the user types anything. */
export async function peekResetToken(token: string): Promise<{ email: string } | null> {
  const record = await EmailVerification.findOne({ tokenHash: hashSecret(token), purpose: 'reset' }).lean();
  if (!record || new Date(record.expiresAt).getTime() < Date.now()) return null;
  return { email: record.email };
}

/** Validates and burns a reset token, returning the e-mail it belongs to. */
export async function consumeResetToken(token: string): Promise<string> {
  const record = await EmailVerification.findOneAndDelete({
    tokenHash: hashSecret(token),
    purpose: 'reset',
  });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw ApiError.badRequest('Este link expirou ou já foi usado. Peça um novo link de redefinição.');
  }
  return record.email;
}
