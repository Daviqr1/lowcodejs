import z from 'zod';

import {
  boolFlag,
  pagination,
  search,
} from '@application/features/_shared.validator';

export const LoggerPaginatedQueryValidator = pagination().extend({
  search: search(),

  // Filtra logs por estado de lixeira (default: ativos).
  trashed: boolFlag(),
});

export type LoggerPaginatedPayload = z.infer<
  typeof LoggerPaginatedQueryValidator
>;
