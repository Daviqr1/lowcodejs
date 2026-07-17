import slugify from 'slugify';
import z from 'zod';

import {
  E_MENU_ITEM_TYPE,
  E_PERMISSION_TARGET,
} from '@application/core/entity.core';

// Visibilidade da opção de menu (Grupo|Public|Nobody).
export const MenuVisibilityValidator = z
  .object({
    kind: z.enum([
      E_PERMISSION_TARGET.PUBLIC,
      E_PERMISSION_TARGET.NOBODY,
      E_PERMISSION_TARGET.GROUP,
    ]),
    group: z.string().trim().nullable().default(null),
  })
  .nullable()
  .optional();

export const MenuCreateBodyValidator = z
  .object({
    name: z
      .string({ message: 'O nome é obrigatório' })
      .trim()
      .min(1, 'O nome é obrigatório'),
    type: z.enum(E_MENU_ITEM_TYPE, { message: 'Tipo inválido' }),
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
      slug: slugify(payload.name, { lower: true, trim: true }),
      parent: payload.parent ?? null,
    };
  })
  .refine(
    (data) => {
      if (data.type === E_MENU_ITEM_TYPE.EXTERNAL) {
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
      if (data.type === E_MENU_ITEM_TYPE.PAGE) {
        return !!data.html;
      }
      return true;
    },
    {
      message: 'Conteúdo HTML é obrigatório para páginas',
      path: ['html'],
    },
  )
  .refine(
    (data) => {
      if (data.type === E_MENU_ITEM_TYPE.EXTENSION_MODULE) {
        return !!data.extension?.pkg && !!data.extension?.extensionId;
      }
      return true;
    },
    {
      message: 'Selecione um módulo de extensão',
      path: ['extension'],
    },
  );

export type MenuCreatePayload = z.infer<typeof MenuCreateBodyValidator>;
