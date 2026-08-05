import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import {
  PaginationQueryValidator,
  PerPageValidator,
} from '@application/core/validator.core';

/**
 * Entrada da fatia `notifications`. Fonte unica — os `*.schema.ts` derivam
 * daqui o JSON Schema da rota com `zodToRouteSchema`.
 */

/** `:_id` de `delete` e `mark-as-read`, antes declarado solto em cada controller. */
export const NotificationIdentifierParamsValidator = z.object({
  _id: z
    .string({ message: 'O ID deve ser um texto' })
    .trim()
    .min(1, 'O ID é obrigatório'),
});

export const NotificationPaginatedQueryValidator =
  PaginationQueryValidator.extend({
    perPage: PerPageValidator.default(20),
    unreadOnly: z
      .preprocess(
        (value) => {
          if (typeof value === 'boolean') return String(value);
          return value;
        },
        z.enum(['true', 'false']).transform((value) => value === 'true'),
      )
      .optional(),
  });

/** Escopo do dono, injetado pelo controller a partir da sessao. */
export type NotificationPaginatedPayload = Merge<
  z.infer<typeof NotificationPaginatedQueryValidator>,
  { userId: string }
>;
