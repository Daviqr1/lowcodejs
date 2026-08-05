import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import { BulkIdsValidator } from '@application/core/validator.core';

export const UserBulkDeleteBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type UserBulkDeletePayload = Merge<
  z.infer<typeof UserBulkDeleteBodyValidator>,
  {
    actorId: string;
  }
>;
