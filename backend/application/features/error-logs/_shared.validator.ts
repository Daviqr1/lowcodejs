import z from 'zod';

import {
  boolFlag,
  pagination,
  search,
  sortDirection,
} from '@application/features/_shared.validator';

/** Entrada da fatia `error-logs`. Fonte unica dos `*.schema.ts`. */

export const ErrorLogPaginatedQueryValidator = pagination().extend({
  search: search(),
  // CSV de status HTTP (ex.: "404,500") — filtra por vários de uma vez.
  statuses: z.string().optional(),
  // Intervalo de datas (ISO) aplicado sobre createdAt.
  'date-from': z.string().optional(),
  'date-to': z.string().optional(),
  // Visão da lista: 'true' = resolvidos; ausente/'false' = em aberto.
  resolved: boolFlag(),
  // Ordenação por coluna (espelha os DataTableColumnHeader da tela).
  'order-created-at': sortDirection(),
  'order-status': sortDirection(),
  'order-method': sortDirection(),
  'order-url': sortDirection(),
});

export type ErrorLogPaginatedPayload = z.infer<
  typeof ErrorLogPaginatedQueryValidator
>;

export const ErrorLogResolveParamsValidator = z.object({
  id: z.string({ message: 'O ID é obrigatório' }).min(1, 'O ID é obrigatório'),
});

export const ErrorLogResolveBodyValidator = z.object({
  resolved: z.boolean({ message: 'O campo resolved é obrigatório' }),
});

export type ErrorLogResolveParams = z.infer<
  typeof ErrorLogResolveParamsValidator
>;
export type ErrorLogResolveBody = z.infer<typeof ErrorLogResolveBodyValidator>;
