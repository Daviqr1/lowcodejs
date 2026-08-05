import z from 'zod';

import { pagination, boolFlag } from '@application/features/_shared.validator';

export const LoggerPaginatedQueryValidator = pagination().extend({
  search: z.string({ message: 'A busca deve ser um texto' }).trim().optional(),

  // Filtra logs por estado de lixeira (default: ativos).
  trashed: boolFlag(),
});

export type LoggerPaginatedPayload = z.infer<
  typeof LoggerPaginatedQueryValidator
>;
