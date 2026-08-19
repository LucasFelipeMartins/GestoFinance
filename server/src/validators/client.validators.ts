import { z } from 'zod';
import { PRIORITIES, STATUSES } from '../types/enums';

const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const baseClientFields = {
  name: z.string().trim().min(2, 'O nome deve ter ao menos 2 caracteres.'),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Informe um telefone válido no formato (99) 99999-9999.'),
  service: z.string().trim().min(1, 'O serviço é obrigatório.'),
  price: z.coerce.number().min(0, 'Informe um valor maior ou igual a R$ 0,00.'),
  priority: z.enum(PRIORITIES, { message: 'Selecione uma prioridade.' }),
  status: z.enum(STATUSES).optional().default('pending'),
  avatarUrl: z.string().optional(),
};

export const createClientSchema = z.object({
  ...baseClientFields,
  localId: z.string().regex(uuidRegex, 'localId inválido.'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const updateClientSchema = z.object({
  ...baseClientFields,
  updatedAt: z.coerce.date(),
}).partial({
  name: true,
  phone: true,
  service: true,
  price: true,
  priority: true,
  status: true,
  avatarUrl: true,
});

export const updateClientStatusSchema = z.object({
  status: z.enum(STATUSES),
  updatedAt: z.coerce.date(),
});

export const clientQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  sort: z.enum(['name', 'price', 'priority', 'createdAt', 'status']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
