import z from 'zod';

import { E_USER_STATUS } from '@application/core/entity.core';

export const UserBulkUpdateBodyValidator = z.object({
  ids: z.array(z.string().trim()).min(1).max(500),
  status: z.enum([E_USER_STATUS.ACTIVE, E_USER_STATUS.INACTIVE], {
    message: 'O status deve ser ACTIVE ou INACTIVE',
  }),
});

export type UserBulkUpdatePayload = z.infer<
  typeof UserBulkUpdateBodyValidator
> & {
  actorId: string;
};
