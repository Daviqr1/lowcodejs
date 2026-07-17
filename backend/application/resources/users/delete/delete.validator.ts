import z from 'zod';

import type { Merge } from '@application/core/entity.core';

export const UserDeleteParamValidator = z.object({
  _id: z
    .string({ message: 'O ID é obrigatório' })
    .trim()
    .min(1, 'O ID é obrigatório'),
});

export type UserDeletePayload = Merge<
  z.infer<typeof UserDeleteParamValidator>,
  {
    actorId: string;
  }
>;
