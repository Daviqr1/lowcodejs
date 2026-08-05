import z from 'zod';

import { E_USER_STATUS, type Merge } from '@application/core/entity.core';
import { BulkIdsValidator } from '@application/core/validator.core';

export const UserBulkUpdateBodyValidator = z.object({
  ids: BulkIdsValidator.max(500),
  status: z.enum([E_USER_STATUS.ACTIVE, E_USER_STATUS.INACTIVE], {
    message: 'O status deve ser ACTIVE ou INACTIVE',
  }),
});

export type UserBulkUpdatePayload = Merge<
  z.infer<typeof UserBulkUpdateBodyValidator>,
  {
    actorId: string;
  }
>;
