import z from 'zod';

import type { Merge } from '@application/core/entity.core';

export const BulkRestoreParamsValidator = z.object({
  slug: z.string().trim(),
});

export const BulkRestoreBodyValidator = z.object({
  ids: z.array(z.string().trim()).min(1),
});

export type BulkRestorePayload = Merge<
  z.infer<typeof BulkRestoreParamsValidator>,
  z.infer<typeof BulkRestoreBodyValidator>
>;
