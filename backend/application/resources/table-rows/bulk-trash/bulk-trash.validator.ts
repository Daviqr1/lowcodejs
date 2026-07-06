import z from 'zod';

import type { Merge } from '@application/core/entity.core';

export const BulkTrashParamsValidator = z.object({
  slug: z.string().trim(),
});

export const BulkTrashBodyValidator = z.object({
  ids: z.array(z.string().trim()).min(1),
});

export type BulkTrashPayload = Merge<
  z.infer<typeof BulkTrashParamsValidator>,
  z.infer<typeof BulkTrashBodyValidator>
>;
