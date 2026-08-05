import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import {
  PaginationQueryValidator,
  PerPageValidator,
} from '@application/core/validator.core';

export const NotificationPaginatedQueryValidator =
  PaginationQueryValidator.extend({
    perPage: PerPageValidator.default(20),
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
