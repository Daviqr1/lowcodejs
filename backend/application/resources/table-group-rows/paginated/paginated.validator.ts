import z from 'zod';

import { Merge } from '@application/core/entity.core';
import { PaginationQueryValidator } from '@application/core/validator.core';

export const GroupRowPaginatedQueryValidator = PaginationQueryValidator.extend({
  search: z.string().trim().optional(),
}).loose();

export const GroupRowPaginatedParamsValidator = z.object({
  slug: z.string().trim(),
  rowId: z.string().trim(),
  groupSlug: z.string().trim(),
});

export type GroupRowPaginatedPayload = Merge<
  z.infer<typeof GroupRowPaginatedParamsValidator>,
  z.infer<typeof GroupRowPaginatedQueryValidator>
>;
