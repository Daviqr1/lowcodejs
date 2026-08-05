import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import {
  boolFlag,
  identifier,
  pagination,
  perPage,
} from '@application/features/_shared.validator';

/**
 * Entrada da fatia `notifications`. Fonte unica — os `*.schema.ts` derivam
 * daqui o JSON Schema da rota com `zodToRouteSchema`.
 */

/** `:_id` de `delete` e `mark-as-read`, antes declarado solto em cada controller. */
export const NotificationIdentifierParamsValidator = identifier();

export const NotificationPaginatedQueryValidator = pagination().extend({
  perPage: perPage().default(20),
  unreadOnly: boolFlag(),
});

/** Escopo do dono, injetado pelo controller a partir da sessao. */
export type NotificationPaginatedPayload = Merge<
  z.infer<typeof NotificationPaginatedQueryValidator>,
  { userId: string }
>;
