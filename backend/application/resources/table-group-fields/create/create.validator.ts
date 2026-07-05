import z from 'zod';

import { E_FIELD_TYPE } from '@application/core/entity.core';
import type { IFieldValidation, Merge } from '@application/core/entity.core';
import {
  FIELD_NAME_MAX_LENGTH,
  FIELD_SLUG_MAX_LENGTH,
} from '@application/core/field-slug.core';

import { TableFieldBaseSchema } from '../group-field-base.schema';

export const GroupFieldCreateBodyValidator = z
  .object({
    name: z.string().trim().min(1).max(FIELD_NAME_MAX_LENGTH),
    slug: z.string().trim().max(FIELD_SLUG_MAX_LENGTH).optional(),
    type: z.enum(E_FIELD_TYPE),
  })
  .merge(TableFieldBaseSchema);

export const GroupFieldCreateParamsValidator = z.object({
  slug: z.string().trim(),
  groupSlug: z.string().trim(),
});

export type GroupFieldCreatePayload = Merge<
  Omit<
    z.infer<typeof GroupFieldCreateBodyValidator>,
    | 'allowCustomDropdownOptions'
    | 'tip'
    | 'htmlContent'
    | 'slug'
    | 'validations'
  >,
  {
    slug?: string;
    tableSlug?: string;
    groupSlug: string;
    allowCustomDropdownOptions?: boolean;
    tip?: string | null;
    htmlContent?: string | null;
    // Opcional no tipo (specs/clients podem omitir); runtime sempre [] via zod.
    validations?: IFieldValidation[];
  }
>;
