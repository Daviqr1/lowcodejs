import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import {
  fieldIdentity,
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
function groupParams(): z.ZodObject<
  {
    slug: z.ZodString;
    groupSlug: z.ZodString;
  },
  z.core.$strip
> {
  return z.object({
    slug: z.string().trim(),
    groupSlug: z.string().trim(),
  });
}

export const GroupParamsValidator = groupParams();

/** `:slug` + `:groupSlug` + `:fieldId` — aponta um campo do grupo. */
export const GroupFieldParamsValidator = groupParams().extend({
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

export const GroupFieldCreateBodyValidator =
  fieldIdentity().merge(TableFieldBaseSchema);

export type GroupFieldCreatePayload = Merge<
  Omit<z.infer<typeof GroupFieldCreateBodyValidator>, OverriddenKeys>,
  GroupFieldPayloadOverrides
>;

export const GroupFieldUpdateBodyValidator = fieldIdentity()
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

export type GroupFieldUpdatePayload = Merge<
  Omit<z.infer<typeof GroupFieldUpdateBodyValidator>, OverriddenKeys>,
  Merge<GroupFieldPayloadOverrides, { fieldId: string }>
>;
