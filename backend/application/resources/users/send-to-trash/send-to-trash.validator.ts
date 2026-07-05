import z from 'zod';

import type { Merge } from '@application/core/entity.core';

export const UserSendToTrashParamValidator = z.object({
  _id: z
    .string({ message: 'O ID é obrigatório' })
    .trim()
    .min(1, 'O ID é obrigatório'),
});

export type UserSendToTrashPayload = Merge<
  z.infer<typeof UserSendToTrashParamValidator>,
  {
    actorId: string;
  }
>;
