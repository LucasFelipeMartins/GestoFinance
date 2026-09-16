import { z } from 'zod';

/**
 * Mirror of the server's password policy (server/src/utils/passwordPolicy.ts),
 * so the person hears about a weak password while typing it — not two
 * screens later, when the e-mail code is checked.
 */
const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '123456780',
  '87654321',
  '11111111',
  '00000000',
  '12341234',
  'password',
  'password1',
  'password123',
  'senha123',
  'senha1234',
  'senha12345',
  'minhasenha',
  'mudar123',
  'qwerty123',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm123',
  '1q2w3e4r',
  '1q2w3e4r5t',
  'abcd1234',
  'abc12345',
  'iloveyou',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'superman',
  'brasil123',
  'brasil2024',
  'brasil2025',
  'brasil2026',
  'flamengo',
  'corinthians',
  'palmeiras',
  'gestor123',
  'gestorfinance',
  'admin123',
  'administrador',
  'welcome1',
  'letmein1',
  'trustno1',
  'dragon123',
  'master123',
  'monkey123',
  'shadow123',
  'jesus123',
  'deusefiel',
  'amor1234',
  'familia123',
  'teamo123',
]);

export function isTrivialPassword(password: string): boolean {
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return true;
  if (/^(.)\1+$/.test(lower)) return true;
  const codes = Array.from(lower).map((c) => c.charCodeAt(0));
  const step = codes[1] - codes[0];
  if ((step === 1 || step === -1) && codes.every((c, i) => i === 0 || c - codes[i - 1] === step)) return true;
  return false;
}

export const PASSWORD_MIN = 8;

/** Validation for any password being set (sign-up, reset, change). */
export const passwordField = z
  .string()
  .min(PASSWORD_MIN, `A senha deve ter ao menos ${PASSWORD_MIN} caracteres.`)
  .max(128, 'A senha pode ter no máximo 128 caracteres.')
  .refine((value) => !isTrivialPassword(value), {
    message: 'Essa senha é muito comum ou previsível. Misture letras, números ou símbolos.',
  });

export const PASSWORD_HINT = `Mínimo de ${PASSWORD_MIN} caracteres. Evite sequências (12345678) e senhas comuns.`;
