import z from 'zod';

import {
  PaginationQueryValidator,
  TrashedFlagValidator,
} from '@application/core/validator.core';

export const LoggerPaginatedQueryValidator = PaginationQueryValidator.extend({
  search: z.string({ message: 'A busca deve ser um texto' }).trim().optional(),

  // Filtra logs por estado de lixeira (default: ativos).
  trashed: TrashedFlagValidator,
});

export type LoggerPaginatedPayload = z.infer<
  typeof LoggerPaginatedQueryValidator
>;
