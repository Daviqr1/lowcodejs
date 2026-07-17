import z from 'zod';

import type { Merge } from '@application/core/entity.core';

export const NotificationPaginatedQueryValidator = z.object({
  page: z.coerce
    .number({ message: 'A página deve ser um número' })
    .min(1, 'A página deve ser maior que zero')
    .default(1),
  perPage: z.coerce
    .number({ message: 'O limite por página deve ser um número' })
    .min(1, 'O limite por página deve ser maior que zero')
    .max(100, 'O limite por página deve ser no máximo 100')
    .default(20),
  unreadOnly: z
    .preprocess(
      (v) => {
        if (typeof v === 'boolean') return String(v);
        return v;
      },
      z.enum(['true', 'false']).transform((v) => v === 'true'),
    )
    .optional(),
});

export type NotificationPaginatedPayload = Merge<
  z.infer<typeof NotificationPaginatedQueryValidator>,
  {
    userId: string;
  }
>;
