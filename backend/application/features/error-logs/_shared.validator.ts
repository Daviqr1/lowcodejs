import z from 'zod';

import { pagination } from '@application/features/_shared.validator';

/** Entrada da fatia `error-logs`. Fonte unica dos `*.schema.ts`. */

export const ErrorLogPaginatedQueryValidator = pagination().extend({
  search: z.string().trim().optional(),
  // CSV de status HTTP (ex.: "404,500") — filtra por vários de uma vez.
  statuses: z.string().optional(),
  // Intervalo de datas (ISO) aplicado sobre createdAt.
  'date-from': z.string().optional(),
  'date-to': z.string().optional(),
  // Visão da lista: 'true' = resolvidos; ausente/'false' = em aberto.
  resolved: z.enum(['true', 'false']).optional(),
  // Ordenação por coluna (espelha os DataTableColumnHeader da tela).
  'order-created-at': z.enum(['asc', 'desc']).optional(),
  'order-status': z.enum(['asc', 'desc']).optional(),
  'order-method': z.enum(['asc', 'desc']).optional(),
  'order-url': z.enum(['asc', 'desc']).optional(),
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
