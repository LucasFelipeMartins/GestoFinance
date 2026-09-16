import { z } from 'zod';
import { newPasswordField } from '../utils/passwordPolicy';

const emailField = z.string().trim().toLowerCase().max(254, 'E-mail muito longo.').email('Informe um e-mail válido.');
const nameField = z
  .string()
  .trim()
  .min(2, 'O nome deve ter ao menos 2 caracteres.')
  .max(80, 'O nome pode ter no máximo 80 caracteres.');
const codeField = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'O código tem 6 números.');

/** Step 1 of sign-up: ask for the confirmation code. */
export const requestRegisterCodeSchema = z.object({
  name: nameField,
  email: emailField,
});

/** Step 2 of sign-up: the account itself, gated by the e-mailed code. */
export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: newPasswordField,
  code: codeField,
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Informe sua senha.').max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Link inválido.').max(200),
  password: newPasswordField,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe sua senha atual.').max(128),
  newPassword: newPasswordField,
});

export type RequestRegisterCodeInput = z.infer<typeof requestRegisterCodeSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
