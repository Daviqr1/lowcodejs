import z from 'zod';

import { Merge } from '@application/core/entity.core';

export const TableRowPaginatedQueryValidator = z
  .object({
    page: z.coerce.number().default(1),
    perPage: z.coerce.number().default(50),
    search: z.string().trim().optional(),
    // Filtro excludeLinked: oculta registros já vinculados (autocomplete 1:1/N:N).
    excludeLinked: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    relationshipId: z.string().trim().optional(),
    excludeSide: z.enum(['source', 'target']).optional(),
    excludeForRecordId: z.string().trim().optional(),
    // Auto-relacionamento: oculta o próprio registro editado da lista de
    // candidatos (só tem efeito quando a tabela-alvo é a própria).
    excludeSelfId: z.string().trim().optional(),
  })
  .loose();

export const TableRowPaginatedParamsValidator = z.object({
  slug: z.string().trim(),
  // _id: z.string().trim(),
});

export type TableRowPaginatedPayload = Merge<
  z.infer<typeof TableRowPaginatedParamsValidator>,
  z.infer<typeof TableRowPaginatedQueryValidator>
>;
