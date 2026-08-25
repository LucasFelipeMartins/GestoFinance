import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const baseGoalFields = {
  title: z.string().trim().min(1, 'Dê um nome para a meta.'),
  targetAmount: z.coerce.number({ message: 'Informe um valor.' }).positive('O valor deve ser maior que zero.'),
  targetDate: z.coerce.date({ message: 'Informe um prazo válido.' }),
  notes: z.string().trim().optional(),
  completedAt: z.coerce.date().optional(),
};

export const createGoalSchema = z.object({
  ...baseGoalFields,
  localId: z.string().regex(uuidRegex, 'localId inválido.'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const updateGoalSchema = z
  .object({ ...baseGoalFields, updatedAt: z.coerce.date() })
  .partial({ title: true, targetAmount: true, targetDate: true, notes: true, completedAt: true });

const baseContributionFields = {
  goalId: z.string().regex(uuidRegex, 'Meta inválida.'),
  // Negative is allowed on purpose: it is how a mistaken deposit gets undone
  // without deleting the history of what happened.
  amount: z.coerce.number({ message: 'Informe um valor.' }),
  date: z.coerce.date({ message: 'Informe uma data válida.' }),
  note: z.string().trim().optional(),
};

export const createGoalContributionSchema = z.object({
  ...baseContributionFields,
  localId: z.string().regex(uuidRegex, 'localId inválido.'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const updateGoalContributionSchema = z
  .object({ ...baseContributionFields, updatedAt: z.coerce.date() })
  .partial({ goalId: true, amount: true, date: true, note: true });

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type CreateGoalContributionInput = z.infer<typeof createGoalContributionSchema>;
