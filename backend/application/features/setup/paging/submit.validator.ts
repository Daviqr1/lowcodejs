import z from 'zod';

export const SetupPagingBodyValidator = z.object({
  PAGINATION_PER_PAGE: z.coerce
    .number({ message: 'A paginação deve ser um número' })
    .min(1, 'A paginação deve ser maior que zero'),
  MODEL_CLONE_TABLES: z.array(z.string()).optional(),
});

export type SetupPagingPayload = z.infer<typeof SetupPagingBodyValidator>;
