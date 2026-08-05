import z from 'zod';

import { PaginationQueryValidator } from '@application/core/validator.core';

export const MenuPaginatedQueryValidator = PaginationQueryValidator.extend({
  search: z.string({ message: 'A busca deve ser um texto' }).trim().optional(),
  trashed: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),

  'order-name': z.enum(['asc', 'desc']).optional(),
  'order-position': z.enum(['asc', 'desc']).optional(),
  'order-slug': z.enum(['asc', 'desc']).optional(),
  'order-type': z.enum(['asc', 'desc']).optional(),
  'order-created-at': z.enum(['asc', 'desc']).optional(),
  'order-owner': z.enum(['asc', 'desc']).optional(),
});

export type MenuPaginatedPayload = z.infer<typeof MenuPaginatedQueryValidator>;
