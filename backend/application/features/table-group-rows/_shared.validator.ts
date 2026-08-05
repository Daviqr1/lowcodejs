import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import {
  autoSaveQuery,
  pagination,
  search,
  subdocumentRefs,
} from '@application/features/_shared.validator';

/**
 * Entrada da fatia `table-group-rows`. Fonte unica — os `*.schema.ts` derivam
 * daqui o JSON Schema da rota com `zodToRouteSchema`.
 */

/** `:slug` + `:rowId` + `:groupSlug` — aponta o grupo dentro de uma row. */
function groupRowParams(): z.ZodObject<
  {
    slug: z.ZodString;
    rowId: z.ZodString;
    groupSlug: z.ZodString;
  },
  z.core.$strip
> {
  return z.object({
    slug: z.string().trim(),
    rowId: z.string().trim(),
    groupSlug: z.string().trim(),
  });
}

export const GroupRowParamsValidator = groupRowParams();

/** Mais `:itemId` — aponta um item do grupo. */
export const GroupRowItemParamsValidator = groupRowParams().extend({
  itemId: z.string().trim(),
});

export type GroupRowListPayload = z.infer<typeof GroupRowParamsValidator>;
export type GroupRowExportCsvPayload = z.infer<typeof GroupRowParamsValidator>;
export type GroupRowShowPayload = z.infer<typeof GroupRowItemParamsValidator>;
export type GroupRowDeletePayload = z.infer<typeof GroupRowItemParamsValidator>;

/**
 * Corpo dinamico do item de grupo: as chaves sao os slugs dos campos
 * configurados no low-code, entao o formato so pode ser descrito por tipo de
 * valor. A validacao por campo roda no use-case, contra a definicao da tabela.
 */
function groupRowValue(): z.ZodUnion<
  readonly [
    z.ZodString,
    z.ZodNumber,
    z.ZodBoolean,
    z.ZodNull,
    z.ZodArray<z.ZodString>,
    z.ZodArray<z.ZodNumber>,
    z.ZodObject<{}, z.core.$loose>,
  ]
> {
  return z.union([
    z.string().trim(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.string().trim()),
    z.array(z.number()),
    z.object({}).loose(),
  ]);
}

export const GroupRowBodyValidator = z.record(z.string(), groupRowValue());

export type GroupRowCreatePayload = Merge<
  z.infer<typeof GroupRowParamsValidator>,
  z.infer<typeof GroupRowBodyValidator>
>;

export type GroupRowUpdatePayload = Merge<
  z.infer<typeof GroupRowItemParamsValidator>,
  z.infer<typeof GroupRowBodyValidator>
>;

// ── Auto-save ─────────────────────────────────────────────────────────

/** O rascunho tambem aceita array de objetos parciais (item ainda sem `_id`). */
export const GroupRowAutoSaveBodyValidator = z.record(
  z.string(),
  z.union([groupRowValue(), subdocumentRefs()]),
);

export const GroupRowAutoSaveQueryValidator = autoSaveQuery();

export type GroupRowAutoSavePayload = Merge<
  z.infer<typeof GroupRowParamsValidator>,
  z.infer<typeof GroupRowAutoSaveBodyValidator>
>;

// ── Listagem ──────────────────────────────────────────────────────────

export const GroupRowPaginatedQueryValidator = pagination()
  .extend({
    search: search(),
  })
  .loose();

export type GroupRowPaginatedPayload = Merge<
  z.infer<typeof GroupRowParamsValidator>,
  z.infer<typeof GroupRowPaginatedQueryValidator>
>;
