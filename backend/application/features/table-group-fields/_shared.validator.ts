import z from 'zod';

import { E_FIELD_TYPE, type Merge } from '@application/core/entity.core';
import {
  NAME_MAX_LENGTH,
  SLUG_MAX_LENGTH,
} from '@application/core/field-rules.core';
import {
  type FieldPayloadOverrides,
  type OverriddenKeys,
  TableFieldBaseSchema,
} from '@application/features/_shared.field.validator';

/**
 * Entrada da fatia `table-group-fields`. Fonte unica — os `*.schema.ts` derivam
 * daqui o JSON Schema da rota com `zodToRouteSchema`.
 *
 * Os blocos de configuracao do campo vem do `_shared.field.validator.ts`
 * global: um campo de grupo e um campo, com o mesmo formulario. Antes vinham
 * do `_shared` de `table-fields` — uma feature importando da irma.
 */

/** `:slug` + `:groupSlug` — aponta o grupo dentro da tabela. */
export const GroupParamsValidator = z.object({
  slug: z.string().trim(),
  groupSlug: z.string().trim(),
});

/** `:slug` + `:groupSlug` + `:fieldId` — aponta um campo do grupo. */
export const GroupFieldParamsValidator = GroupParamsValidator.extend({
  fieldId: z.string().trim(),
});

export type GroupFieldListPayload = z.infer<typeof GroupParamsValidator>;
export type GroupFieldShowPayload = z.infer<typeof GroupFieldParamsValidator>;
export type GroupFieldSendToTrashPayload = z.infer<
  typeof GroupFieldParamsValidator
>;
export type GroupFieldRemoveFromTrashPayload = z.infer<
  typeof GroupFieldParamsValidator
>;

/** O mesmo do campo comum, mais o grupo que o contem. */
type GroupFieldPayloadOverrides = Merge<
  FieldPayloadOverrides,
  { groupSlug: string }
>;

export const GroupFieldCreateBodyValidator = z
  .object({
    name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
    slug: z.string().trim().max(SLUG_MAX_LENGTH).optional(),
    type: z.enum(E_FIELD_TYPE),
  })
  .merge(TableFieldBaseSchema);

export type GroupFieldCreatePayload = Merge<
  Omit<z.infer<typeof GroupFieldCreateBodyValidator>, OverriddenKeys>,
  GroupFieldPayloadOverrides
>;

export const GroupFieldUpdateBodyValidator = z
  .object({
    name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
    slug: z.string().trim().max(SLUG_MAX_LENGTH).optional(),
    type: z.enum(E_FIELD_TYPE),
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

export type GroupFieldUpdatePayload = Merge<
  Omit<z.infer<typeof GroupFieldUpdateBodyValidator>, OverriddenKeys>,
  Merge<GroupFieldPayloadOverrides, { fieldId: string }>
>;
