import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import { BulkIdsValidator } from '@application/core/validator.core';

export const UserBulkTrashBodyValidator = z.object({
  ids: BulkIdsValidator,
});

export type UserBulkTrashPayload = Merge<
  z.infer<typeof UserBulkTrashBodyValidator>,
  {
    actorId: string;
  }
>;
