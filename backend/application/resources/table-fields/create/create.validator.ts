import z from 'zod';

import { E_FIELD_TYPE } from '@application/core/entity.core';
import type { IFieldValidation, Merge } from '@application/core/entity.core';
import {
  FIELD_NAME_MAX_LENGTH,
  FIELD_SLUG_MAX_LENGTH,
} from '@application/core/field-slug.core';

import { TableFieldBaseSchema } from '../table-field-base.schema';

export const TableFieldCreateBodyValidator = z
  .object({
    name: z.string().trim().min(1).max(FIELD_NAME_MAX_LENGTH),
    slug: z.string().trim().max(FIELD_SLUG_MAX_LENGTH).optional(),
    type: z.enum(E_FIELD_TYPE),
  })
  .merge(TableFieldBaseSchema);

export const TableFieldCreateParamsValidator = z.object({
  slug: z.string().trim(),
});

export type TableFieldCreatePayload = Merge<
  Omit<
    z.infer<typeof TableFieldCreateBodyValidator>,
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
    allowCustomDropdownOptions?: boolean;
    fillWithCurrentUserWhenEmpty?: boolean;
    tip?: string | null;
    htmlContent?: string | null;
    // Opcional no tipo (specs/clients podem omitir); runtime sempre [] via zod.
    validations?: IFieldValidation[];
  }
>;
