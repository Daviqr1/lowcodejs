import z from 'zod';

import { BulkIdsValidator } from '@application/core/validator.core';

export const UserBulkRestoreBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type UserBulkRestorePayload = z.infer<
  typeof UserBulkRestoreBodyValidator
>;
