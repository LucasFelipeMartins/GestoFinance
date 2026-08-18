import { z } from 'zod';
import { PRIORITIES, STATUSES } from '../types/enums';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'O título é obrigatório.'),
  description: z.string().trim().optional(),
  clientId: z.string().regex(objectIdRegex, 'Cliente inválido.').optional().or(z.literal('')),
  dueDate: z.coerce.date().optional(),
  priority: z.enum(PRIORITIES, { message: 'Selecione uma prioridade.' }),
  status: z.enum(STATUSES).optional().default('pending'),
});

export const updateTaskSchema = createTaskSchema.partial();

export const updateTaskStatusSchema = z.object({
  status: z.enum(STATUSES),
});

export const taskQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  clientId: z.string().regex(objectIdRegex).optional(),
  sort: z.enum(['dueDate', 'priority', 'createdAt', 'status']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
