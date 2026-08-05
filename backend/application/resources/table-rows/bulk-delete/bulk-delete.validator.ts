import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import { BulkIdsValidator } from '@application/core/validator.core';

export const BulkDeleteParamsValidator = z.object({
  slug: z.string().trim(),
});

export const BulkDeleteBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type BulkDeletePayload = Merge<
  z.infer<typeof BulkDeleteParamsValidator>,
  z.infer<typeof BulkDeleteBodyValidator>
>;
