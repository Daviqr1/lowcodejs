import z from 'zod';

import type { Merge } from '@application/core/entity.core';
import SlugService from '@application/services/slug/slug.service';

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

// Schema Zod de escopo de modulo: avaliado no import, quando o container de DI
// ainda nao existe. O SlugService e puro (constructor sem argumentos).
const slugService = new SlugService();

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
    let slug = slugService.normalize(data.name);
    if (data.slug) {
      slug = slugService.normalize(data.slug);
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
