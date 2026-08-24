import { z } from 'zod';
import { FINANCE_KINDS, PAYMENT_METHODS } from '../types/enums';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const baseFinanceFields = {
  kind: z.enum(FINANCE_KINDS, { message: 'Tipo de lançamento inválido.' }),
  description: z.string().trim().min(1, 'A descrição é obrigatória.'),
  amount: z.coerce.number({ message: 'Informe um valor.' }).min(0, 'O valor não pode ser negativo.'),
  date: z.coerce.date({ message: 'Informe uma data válida.' }),
  category: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  clientId: z.string().regex(uuidRegex, 'Cliente inválido.').optional().or(z.literal('')),
  paid: z.boolean().optional(),
  paidAt: z.coerce.date().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  installments: z.coerce.number().int().min(1).max(120).optional(),
  cdiPercent: z.coerce.number().min(0).max(1000).optional(),
};

export const createFinanceSchema = z.object({
  ...baseFinanceFields,
  localId: z.string().regex(uuidRegex, 'localId inválido.'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const updateFinanceSchema = z
  .object({
    ...baseFinanceFields,
    updatedAt: z.coerce.date(),
  })
  .partial({
    kind: true,
    description: true,
    amount: true,
    date: true,
    category: true,
    notes: true,
    clientId: true,
    paid: true,
    paidAt: true,
    paymentMethod: true,
    installments: true,
    cdiPercent: true,
  });

export const financeQuerySchema = z.object({
  search: z.string().trim().optional(),
  kind: z.enum(FINANCE_KINDS).optional(),
  paid: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  clientId: z.string().regex(uuidRegex).optional(),
  sort: z.enum(['date', 'amount', 'createdAt', 'description']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type CreateFinanceInput = z.infer<typeof createFinanceSchema>;
export type UpdateFinanceInput = z.infer<typeof updateFinanceSchema>;
