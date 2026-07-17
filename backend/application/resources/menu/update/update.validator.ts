import slugify from 'slugify';
import z from 'zod';

import { E_MENU_ITEM_TYPE, Merge } from '@application/core/entity.core';

import { MenuVisibilityValidator } from '../create/create.validator';

export const MenuUpdateParamsValidator = z.object({
  _id: z.string({ message: 'O ID é obrigatório' }).min(1, 'O ID é obrigatório'),
});

export const MenuUpdateBodyValidator = z
  .object({
    name: z
      .string({ message: 'O nome deve ser um texto' })
      .trim()
      .min(1, 'O nome é obrigatório')
      .optional(),
    type: z.enum(E_MENU_ITEM_TYPE, { message: 'Tipo inválido' }).optional(),
    table: z
      .string({ message: 'A tabela deve ser um texto' })
      .nullable()
      .optional(),
    parent: z
      .string({ message: 'O menu pai deve ser um texto' })
      .nullable()
      .optional(),
    html: z
      .string({ message: 'O HTML deve ser um texto' })
      .nullable()
      .optional(),
    url: z.string({ message: 'A URL deve ser um texto' }).nullable().optional(),
    icon: z
      .string({ message: 'O ícone deve ser um texto' })
      .nullable()
      .optional(),
    order: z.number().int().min(0).optional(),
    isInitial: z.boolean({ message: 'Página inicial inválida' }).optional(),
    extension: z
      .object({
        pkg: z.string().min(1),
        extensionId: z.string().min(1),
      })
      .nullable()
      .optional(),
    visibility: MenuVisibilityValidator,
  })
  .transform((payload) => {
    return {
      ...payload,
      ...(payload.name && {
        slug: slugify(payload.name, { lower: true, trim: true }),
      }),
      parent: payload.parent ?? null,
    };
  })
  .refine(
    (data) => {
      if (data.type === E_MENU_ITEM_TYPE.EXTERNAL && data.type !== undefined) {
        return !!data.url;
      }
      return true;
    },
    {
      message: 'URL é obrigatória para links externos',
      path: ['url'],
    },
  )
  .refine(
    (data) => {
      if (data.type === E_MENU_ITEM_TYPE.PAGE && data.type !== undefined) {
        return !!data.html;
      }
      return true;
    },
    {
      message: 'Conteúdo HTML é obrigatório para páginas',
      path: ['html'],
    },
  );

export type MenuUpdatePayload = Merge<
  z.infer<typeof MenuUpdateParamsValidator>,
  z.infer<typeof MenuUpdateBodyValidator>
>;
