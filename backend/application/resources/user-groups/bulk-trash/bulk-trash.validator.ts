import z from 'zod';

import { BulkIdsValidator } from '@application/core/validator.core';

export const UserGroupBulkTrashBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type UserGroupBulkTrashPayload = z.infer<
  typeof UserGroupBulkTrashBodyValidator
>;
