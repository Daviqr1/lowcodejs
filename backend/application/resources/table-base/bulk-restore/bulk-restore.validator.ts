import z from 'zod';

import { BulkIdsValidator } from '@application/core/validator.core';

export const BulkRestoreBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type BulkRestorePayload = z.infer<typeof BulkRestoreBodyValidator>;
