import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import { NAME_MAX_LENGTH } from '@application/core/field-rules.core';
import {
  fieldIdentity,
  type FieldPayloadOverrides,
  type OverriddenKeys,
  TableFieldBaseSchema,
} from '@application/features/_shared.field.validator';
import {
  slugIdParams,
  slugParams,
} from '@application/features/_shared.validator';

/**
 * Entrada da fatia `table-fields`. Fonte unica — os `*.schema.ts` derivam daqui
 * o JSON Schema da rota com `zodToRouteSchema`.
 *
 * Absorve o antigo `table-field-base.schema.ts`, que ja era este arquivo com
 * nome enganoso: guardava blocos Zod de entrada, nao schema de resposta.
 *
 * Cinco operacoes so apelidavam o `slugIdParams()` do core; o apelido
 * some e elas passam a usar o bloco direto.
 */

/** `:slug` da tabela — rotas que ainda nao apontam um campo. */
export const TableSlugParamsValidator = slugParams();

/** `:slug` + `:_id`: tabela + campo. Vem do core, reexportado pela fatia. */
export const TableFieldParamsValidator = slugIdParams();

export type TableFieldShowPayload = z.infer<typeof TableFieldParamsValidator>;
export type TableFieldSendToTrashPayload = z.infer<
  typeof TableFieldParamsValidator
>;
export type TableFieldRemoveFromTrashPayload = z.infer<
  typeof TableFieldParamsValidator
>;

// ── Create e update ───────────────────────────────────────────────────

export const TableFieldCreateBodyValidator =
  fieldIdentity().merge(TableFieldBaseSchema);

export type TableFieldCreatePayload = Merge<
  Omit<z.infer<typeof TableFieldCreateBodyValidator>, OverriddenKeys>,
  FieldPayloadOverrides
>;

// slug e opcional: campos nao-nativos podem editar a "url"/chave tecnica do
// campo (honrado no use-case). Campos nativos nao enviam slug (slug camelCase
// fixo) e o use-case os ignora.
export const TableFieldUpdateBodyValidator = fieldIdentity()
  .extend({
    trashed: z.boolean().default(false),
    trashedAt: z
      .string()
      .nullable()
      .default(null)
      .transform((value) => {
        if (value) return new Date(value);
        return null;
      }),
  })
  .merge(TableFieldBaseSchema);

export type TableFieldUpdatePayload = Merge<
  Omit<z.infer<typeof TableFieldUpdateBodyValidator>, OverriddenKeys>,
  Merge<FieldPayloadOverrides, { _id: string }>
>;

// ── Exclusao ──────────────────────────────────────────────────────────

export const TableFieldDeleteQueryValidator = z.object({
  group: z.string().trim().optional(),
});

export type TableFieldDeletePayload = Merge<
  z.infer<typeof TableFieldParamsValidator>,
  z.infer<typeof TableFieldDeleteQueryValidator>
>;

// ── Categorias ────────────────────────────────────────────────────────

export const TableFieldAddCategoryBodyValidator = z.object({
  label: z.string().trim().min(1),
  parentId: z.string().trim().nullable().optional(),
});

export type TableFieldAddCategoryPayload = Merge<
  z.infer<typeof TableFieldParamsValidator>,
  z.infer<typeof TableFieldAddCategoryBodyValidator>
>;

export const TableFieldDeleteCategoryParamsValidator = slugIdParams().extend({
  categoryId: z.string().trim().min(1),
});

export type TableFieldDeleteCategoryPayload = z.infer<
  typeof TableFieldDeleteCategoryParamsValidator
>;

// ── Sugestao de slug ──────────────────────────────────────────────────

export const TableFieldSuggestSlugBodyValidator = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
});

export type TableFieldSuggestSlugPayload = {
  tableSlug: string;
  name: string;
};
