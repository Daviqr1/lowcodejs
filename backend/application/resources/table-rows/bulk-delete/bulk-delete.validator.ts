import z from 'zod';

import type { Merge } from '@application/core/entity.core';

export const BulkDeleteParamsValidator = z.object({
  slug: z.string().trim(),
});

export const BulkDeleteBodyValidator = z.object({
  ids: z.array(z.string().trim()).min(1),
});

export type BulkDeletePayload = Merge<
  z.infer<typeof BulkDeleteParamsValidator>,
  z.infer<typeof BulkDeleteBodyValidator>
>;
