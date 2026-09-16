import { z } from 'zod';
import { FINANCE_KINDS, PAYMENT_METHODS } from '../types/enums';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const baseFinanceFields = {
  kind: z.enum(FINANCE_KINDS, { message: 'Tipo de lançamento inválido.' }),
  description: z.string().trim().min(1, 'A descrição é obrigatória.').max(200, 'Descrição muito longa.'),
  // Negative only for an investimento: that is a resgate (money taken out of
  // a cofrinho). Enforced per kind in the controller, since an update may
  // not carry the kind.
  amount: z.coerce.number({ message: 'Informe um valor.' }).min(-1e9).max(1e9),
  date: z.coerce.date({ message: 'Informe uma data válida.' }),
  category: z.string().trim().max(60, 'Categoria muito longa.').optional(),
  notes: z.string().trim().max(2000, 'Observações muito longas.').optional(),
  clientId: z.string().regex(uuidRegex, 'Cliente inválido.').optional().or(z.literal('')),
  paid: z.boolean().optional(),
  paidAt: z.coerce.date().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  installments: z.coerce.number().int().min(1).max(120).optional(),
  paidInstallments: z.coerce.number().int().min(0).max(120).optional(),
  cdiPercent: z.coerce.number().min(0).max(1000).optional(),
  boxId: z.string().regex(uuidRegex, 'Cofrinho inválido.').optional().or(z.literal('')),
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
    paidInstallments: true,
    cdiPercent: true,
    boxId: true,
  });

export const financeQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
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
