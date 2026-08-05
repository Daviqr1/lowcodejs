import z from 'zod';

import { E_MENU_ITEM_TYPE, type Merge } from '@application/core/entity.core';
import {
  boolFlag,
  bulkIds,
  identifier,
  pagination,
  permissionBinding,
  search,
  sortDirection,
} from '@application/features/_shared.validator';
import SlugService from '@application/services/slug/slug.service';

/**
 * Entrada da fatia `menu`. Fonte unica — os `*.schema.ts` derivam daqui o JSON
 * Schema da rota com `zodToRouteSchema`.
 *
 * As regras que cruzam campos (url obrigatoria em EXTERNAL, html em PAGE,
 * extension em EXTENSION_MODULE) sao `.refine()`, que nao tem representacao em
 * JSON Schema: o schema da rota descreve a forma, e o `.parse()` do controller
 * garante a regra.
 *
 * Schemas de escopo de modulo: avaliados no import, quando o container de DI
 * ainda nao existe. O SlugService e puro (constructor sem argumentos).
 */
const slugService = new SlugService();

/** `:_id` das rotas por item. Antes copiado em 4 operacoes. */
export const MenuIdentifierParamsValidator = identifier();

/** Busca e ordenacao comuns a listar e exportar. */
function menuFilterQuery(): z.ZodObject<
  {
    search: z.ZodOptional<z.ZodString>;
    trashed: ReturnType<typeof boolFlag>;
    'order-name': ReturnType<typeof sortDirection>;
    'order-position': ReturnType<typeof sortDirection>;
    'order-slug': ReturnType<typeof sortDirection>;
    'order-type': ReturnType<typeof sortDirection>;
    'order-created-at': ReturnType<typeof sortDirection>;
  },
  z.core.$strip
> {
  return z.object({
    search: search(),
    trashed: boolFlag(),
    'order-name': sortDirection(),
    'order-position': sortDirection(),
    'order-slug': sortDirection(),
    'order-type': sortDirection(),
    'order-created-at': sortDirection(),
  });
}

// Visibilidade da opção de menu (Grupo|Public|Nobody).
export const MenuVisibilityValidator = permissionBinding()
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
      slug: slugService.normalize(payload.name),
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
    // `parent` NAO pode virar `null` por default: o use-case trata
    // `parent === undefined` como "nao mexer" e `null` como "mover para a raiz".
    // Forcar o default reparentava todo PATCH parcial para a raiz.
    return {
      ...payload,
      ...(payload.name && {
        slug: slugService.normalize(payload.name),
      }),
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
  z.infer<typeof MenuIdentifierParamsValidator>,
  z.infer<typeof MenuUpdateBodyValidator>
>;

export const MenuPaginatedQueryValidator = menuFilterQuery().extend({
  ...pagination().shape,
  'order-owner': sortDirection(),
});

export type MenuPaginatedPayload = z.infer<typeof MenuPaginatedQueryValidator>;

export const MenuExportCsvQueryValidator = menuFilterQuery();

export type MenuExportCsvPayload = z.infer<typeof MenuExportCsvQueryValidator>;

export type MenuShowPayload = z.infer<typeof MenuIdentifierParamsValidator>;
export type MenuSendToTrashPayload = z.infer<
  typeof MenuIdentifierParamsValidator
>;
export type MenuRemoveFromTrashPayload = z.infer<
  typeof MenuIdentifierParamsValidator
>;
export type MenuDeletePayload = z.infer<typeof MenuIdentifierParamsValidator>;

export const MenuReorderBodyValidator = z.object({
  items: z.array(
    z.object({
      _id: z.string({ message: 'O ID é obrigatório' }).min(1),
      order: z.number().int().min(0),
      parent: z.string().nullable().optional(),
    }),
  ),
});

export type MenuReorderPayload = z.infer<typeof MenuReorderBodyValidator>;

/** `ids` das tres operacoes em massa. */
export const MenuBulkIdsBodyValidator = z.object({ ids: bulkIds() });

export type MenuBulkTrashPayload = z.infer<typeof MenuBulkIdsBodyValidator>;
export type MenuBulkRestorePayload = z.infer<typeof MenuBulkIdsBodyValidator>;
export type MenuBulkDeletePayload = z.infer<typeof MenuBulkIdsBodyValidator>;
