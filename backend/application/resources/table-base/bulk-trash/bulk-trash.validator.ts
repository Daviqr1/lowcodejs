import z from 'zod';

import { BulkIdsValidator } from '@application/core/validator.core';

export const BulkTrashBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type BulkTrashPayload = z.infer<typeof BulkTrashBodyValidator>;
