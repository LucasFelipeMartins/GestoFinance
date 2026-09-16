import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Palette keys the client knows how to paint. */
export const BOX_COLORS = ['sage', 'blue', 'amber', 'rose', 'violet', 'teal'] as const;

const baseBoxFields = {
  name: z.string().trim().min(1, 'Dê um nome ao cofrinho.').max(60, 'Nome muito longo.'),
  cdiPercent: z.coerce.number({ message: 'Informe quanto rende.' }).min(0).max(1000),
  color: z.enum(BOX_COLORS, { message: 'Cor inválida.' }),
  notes: z.string().trim().max(500, 'Observação muito longa.').optional(),
};

export const createBoxSchema = z.object({
  ...baseBoxFields,
  localId: z.string().regex(uuidRegex, 'localId inválido.'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const updateBoxSchema = z
  .object({ ...baseBoxFields, updatedAt: z.coerce.date() })
  .partial({ name: true, cdiPercent: true, color: true, notes: true });

export type CreateBoxInput = z.infer<typeof createBoxSchema>;
