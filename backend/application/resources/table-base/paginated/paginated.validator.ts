import z from 'zod';

import { E_TABLE_VISIBILITY } from '@application/core/entity.core';

export const TablePaginatedQueryValidator = z.object({
  page: z.coerce.number().default(1),
  perPage: z.coerce.number().default(50),
  search: z.string().trim().optional(),
  /**
   * Filtro por IDs especificos (CSV "a,b,c" ou array repetido).
   * Usado por TableMultiSelect pra hidratar tabelas ja selecionadas
   * que nao vieram na primeira pagina.
   */
  _ids: z
    .preprocess(
      (value) => {
        if (value === undefined || value === null || value === '')
          return undefined;
        const arr = Array.isArray(value) ? value : String(value).split(',');
        const cleaned = arr.map((s) => String(s).trim()).filter(Boolean);
        return cleaned.length > 0 ? cleaned : undefined;
      },
      z.array(z.string()).optional(),
    )
    .optional(),
  //
  name: z.string().trim().optional(),
  trashed: z.string().trim().optional(),
  visibility: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const tokens = value
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);
      if (tokens.length === 0) return undefined;
      return tokens;
    })
    .pipe(z.array(z.enum(E_TABLE_VISIBILITY)).optional()),
  owner: z.string().trim().optional(),

  'order-name': z.enum(['asc', 'desc']).optional(),
  'order-link': z.enum(['asc', 'desc']).optional(),
  'order-created-at': z.enum(['asc', 'desc']).optional(),
  'order-visibility': z.enum(['asc', 'desc']).optional(),
  'order-owner': z.enum(['asc', 'desc']).optional(),
});

export type TablePaginatedPayload = z.infer<
  typeof TablePaginatedQueryValidator
>;
