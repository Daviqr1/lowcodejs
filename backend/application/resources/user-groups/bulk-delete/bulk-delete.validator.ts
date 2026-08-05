import z from 'zod';

import { BulkIdsValidator } from '@application/core/validator.core';

export const UserGroupBulkDeleteBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type UserGroupBulkDeletePayload = z.infer<
  typeof UserGroupBulkDeleteBodyValidator
>;
