import z from 'zod';

import type { Merge } from '@application/core/entity.core';

export const UserBulkTrashBodyValidator = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, 'Selecione pelo menos um item'),
});

export type UserBulkTrashPayload = Merge<
  z.infer<typeof UserBulkTrashBodyValidator>,
  {
    actorId: string;
  }
>;
