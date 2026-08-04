import z from 'zod';

import { E_FIELD_TYPE } from '@application/core/entity.core';
import type { IFieldValidation, Merge } from '@application/core/entity.core';
import {
  NAME_MAX_LENGTH,
  SLUG_MAX_LENGTH,
} from '@application/core/field-rules.core';

import { TableFieldBaseSchema } from '../group-field-base.schema';

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

export const GroupFieldUpdateParamsValidator = z.object({
  slug: z.string().trim(),
  groupSlug: z.string().trim(),
  fieldId: z.string().trim(),
});

export type GroupFieldUpdatePayload = Merge<
  Omit<
    z.infer<typeof GroupFieldUpdateBodyValidator>,
    | 'allowCustomDropdownOptions'
    | 'fillWithCurrentUserWhenEmpty'
    | 'tip'
    | 'htmlContent'
    | 'slug'
    | 'validations'
  >,
  {
    slug?: string;
    tableSlug?: string;
    groupSlug: string;
    fieldId: string;
    allowCustomDropdownOptions?: boolean;
    fillWithCurrentUserWhenEmpty?: boolean;
    tip?: string | null;
    htmlContent?: string | null;
    // Opcional no tipo (specs/clients podem omitir); runtime sempre [] via zod.
    validations?: IFieldValidation[];
  }
>;
