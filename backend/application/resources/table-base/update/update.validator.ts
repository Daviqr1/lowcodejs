import slugify from 'slugify';
import z from 'zod';

import type { Merge } from '@application/core/entity.core';

import {
  GroupConfigurationSchema,
  TableFieldOrderDetailSchema,
  TableFieldOrderFilterSchema,
  TableFieldOrderFormSchema,
  TableFieldOrderListSchema,
  TableLayoutFieldsSchema,
  TableMembersSchema,
  TableMethodSchema,
  TableOrderSchema,
  TablePermissionsSchema,
  TableStyleSchema,
} from '../table-base.schema';

export const TableUpdateBodyValidator = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(40, 'Name must be at most 40 characters')
      .regex(
        /^[a-zA-ZáàâãéèêíïóôõöúçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ0-9\s\-_]+$/,
        'Name can only contain letters, numbers, spaces, hyphen, underscore and ç',
      ),
    slug: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable(),
    logo: z.string().trim().nullable(),
    style: TableStyleSchema,
    fieldOrderList: TableFieldOrderListSchema,
    fieldOrderForm: TableFieldOrderFormSchema,
    fieldOrderFilter: TableFieldOrderFilterSchema,
    fieldOrderDetail: TableFieldOrderDetailSchema,
    methods: TableMethodSchema,
    order: TableOrderSchema,
    layoutFields: TableLayoutFieldsSchema.optional(),
    groups: z.array(GroupConfigurationSchema).optional(),
    rowSlugFieldId: z.string().trim().nullable().optional(),
    // Permissoes (Grupo|Public|Nobody por acao) + convidados + troca de dono.
    permissions: TablePermissionsSchema.optional(),
    members: TableMembersSchema.optional(),
    owner: z.string().trim().min(1).optional(),
  })
  .transform((data) => {
    let slug = slugify(data.name, { lower: true, strict: true, trim: true });
    if (data.slug) {
      slug = slugify(data.slug, { lower: true, strict: true, trim: true });
    }
    return { ...data, slug };
  });

export const TableUpdateParamsValidator = z.object({
  slug: z.string().trim(),
});

export type TableUpdatePayload = Merge<
  z.infer<typeof TableUpdateBodyValidator>,
  {
    routeSlug: string;
  }
>;
