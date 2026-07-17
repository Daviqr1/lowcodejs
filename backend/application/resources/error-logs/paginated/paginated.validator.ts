import z from 'zod';

export const ErrorLogPaginatedQueryValidator = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(50),
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
