import { z } from 'zod';
import { PRIORITIES, STATUSES } from '../types/enums';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const baseTaskFields = {
  title: z.string().trim().min(1, 'O título é obrigatório.'),
  description: z.string().trim().optional(),
  clientId: z.string().regex(uuidRegex, 'Cliente inválido.').optional().or(z.literal('')),
  dueDate: z.coerce.date().optional(),
  priority: z.enum(PRIORITIES, { message: 'Selecione uma prioridade.' }),
  status: z.enum(STATUSES).optional().default('pending'),
  // Sent whenever status is 'completed' so the 24h retention counts from the
  // moment the client checked it off, not from when the write reached us —
  // an edit made offline can arrive hours later.
  completedAt: z.coerce.date().optional(),
  reminderEnabled: z.boolean().optional(),
};

export const createTaskSchema = z.object({
  ...baseTaskFields,
  localId: z.string().regex(uuidRegex, 'localId inválido.'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const updateTaskSchema = z.object({
  ...baseTaskFields,
  updatedAt: z.coerce.date(),
}).partial({
  title: true,
  description: true,
  clientId: true,
  dueDate: true,
  priority: true,
  status: true,
  completedAt: true,
  reminderEnabled: true,
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(STATUSES),
  updatedAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
});

export const taskQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  clientId: z.string().regex(uuidRegex).optional(),
  sort: z.enum(['dueDate', 'priority', 'createdAt', 'status']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
