import z from 'zod';

import type { Merge } from '@application/core/entity.core';

export const UserBulkDeleteBodyValidator = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, 'Selecione pelo menos um item'),
});

export type UserBulkDeletePayload = Merge<
  z.infer<typeof UserBulkDeleteBodyValidator>,
  {
    actorId: string;
  }
>;
