import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'O nome deve ter ao menos 2 caracteres.'),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
