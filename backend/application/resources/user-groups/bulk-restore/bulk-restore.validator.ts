import z from 'zod';

import { BulkIdsValidator } from '@application/core/validator.core';

export const UserGroupBulkRestoreBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type UserGroupBulkRestorePayload = z.infer<
  typeof UserGroupBulkRestoreBodyValidator
>;
