import z from 'zod';

import { PaginationQueryValidator } from '@application/core/validator.core';

export const TablePaginatedQueryValidator = PaginationQueryValidator.extend({
  search: z.string().trim().optional(),
  //
  name: z.string().trim().optional(),
  trashed: z.string().trim().optional(),
  owner: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const tokens = value
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);
      if (tokens.length === 0) return undefined;
      return tokens;
    })
    .pipe(z.array(z.string()).optional()),

  'order-name': z.enum(['asc', 'desc']).optional(),
  'order-link': z.enum(['asc', 'desc']).optional(),
  'order-created-at': z.enum(['asc', 'desc']).optional(),
  'order-owner': z.enum(['asc', 'desc']).optional(),
});

export type TablePaginatedPayload = z.infer<
  typeof TablePaginatedQueryValidator
>;
