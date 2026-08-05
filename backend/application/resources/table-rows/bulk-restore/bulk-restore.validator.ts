import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import { BulkIdsValidator } from '@application/core/validator.core';

export const BulkRestoreParamsValidator = z.object({
  slug: z.string().trim(),
});

export const BulkRestoreBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type BulkRestorePayload = Merge<
  z.infer<typeof BulkRestoreParamsValidator>,
  z.infer<typeof BulkRestoreBodyValidator>
>;
