import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import { BulkIdsValidator } from '@application/core/validator.core';

export const BulkTrashParamsValidator = z.object({
  slug: z.string().trim(),
});

export const BulkTrashBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type BulkTrashPayload = Merge<
  z.infer<typeof BulkTrashParamsValidator>,
  z.infer<typeof BulkTrashBodyValidator>
>;
