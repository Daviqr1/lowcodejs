import z from 'zod';

import {
  E_PERMISSION_TARGET,
  E_TABLE_PERMISSION,
  E_TABLE_PROFILE,
  E_TABLE_STYLE,
} from '@application/core/entity.core';

// Binding de uma acao: a quem ela esta liberada (Grupo|Public|Nobody).
export const TablePermissionBindingSchema = z.object({
  kind: z
    .enum([
      E_PERMISSION_TARGET.PUBLIC,
      E_PERMISSION_TARGET.NOBODY,
      E_PERMISSION_TARGET.GROUP,
    ])
    .describe(
      'Alvo da acao: PUBLIC (qualquer pessoa, inclusive sem login), NOBODY ' +
        '(ninguem) ou GROUP (apenas o grupo informado em `group`). Para GROUP ' +
        'vale a regra de intersecao: o usuario tambem precisa da permissao ' +
        'global correspondente no seu grupo.',
    ),
  group: z
    .string()
    .trim()
    .nullable()
    .default(null)
    .describe(
      'Id do grupo liberado quando `kind` = GROUP; null caso contrario.',
    ),
});

// Mapa das 10 acoes -> binding. Todas opcionais.
export const TablePermissionsSchema = z
  .object({
    [E_TABLE_PERMISSION.VIEW_TABLE]: TablePermissionBindingSchema,
    [E_TABLE_PERMISSION.UPDATE_TABLE]: TablePermissionBindingSchema,
    [E_TABLE_PERMISSION.CREATE_FIELD]: TablePermissionBindingSchema,
    [E_TABLE_PERMISSION.UPDATE_FIELD]: TablePermissionBindingSchema,
    [E_TABLE_PERMISSION.REMOVE_FIELD]: TablePermissionBindingSchema,
    [E_TABLE_PERMISSION.VIEW_FIELD]: TablePermissionBindingSchema,
    [E_TABLE_PERMISSION.CREATE_ROW]: TablePermissionBindingSchema,
    [E_TABLE_PERMISSION.UPDATE_ROW]: TablePermissionBindingSchema,
    [E_TABLE_PERMISSION.REMOVE_ROW]: TablePermissionBindingSchema,
    [E_TABLE_PERMISSION.VIEW_ROW]: TablePermissionBindingSchema,
  })
  .partial()
  .describe(
    'Permissoes por acao da tabela (binding Grupo/Publico/Ninguem). O acesso ' +
      'efetivo e a intersecao: alem do binding liberar, o usuario precisa da ' +
      'permissao global da acao no seu grupo. Dono e membros (members[]) sao ' +
      'concessoes explicitas e nao dependem dessa intersecao.',
  );

// Convidados da tabela e seus perfis.
export const TableMembersSchema = z
  .array(
    z.object({
      user: z.string().trim().min(1),
      profile: z.enum([
        E_TABLE_PROFILE.OWNER,
        E_TABLE_PROFILE.ADMIN,
        E_TABLE_PROFILE.EDITOR,
        E_TABLE_PROFILE.CONTRIBUTOR,
        E_TABLE_PROFILE.VIEWER,
      ]),
    }),
  )
  .default([]);

export const GroupConfigurationSchema = z.object({
  slug: z.string().trim(),
  name: z.string().trim(),
  fields: z.array(z.any()).default([]),
  _schema: z.any().default({}),
});

export const TableStyleSchema = z
  .enum([
    E_TABLE_STYLE.GALLERY,
    E_TABLE_STYLE.LIST,
    E_TABLE_STYLE.DOCUMENT,
    E_TABLE_STYLE.CARD,
    E_TABLE_STYLE.MOSAIC,
    E_TABLE_STYLE.KANBAN,
    E_TABLE_STYLE.FORUM,
    E_TABLE_STYLE.CALENDAR,
    E_TABLE_STYLE.GANTT,
  ])
  .default(E_TABLE_STYLE.LIST);

export const TableFieldOrderListSchema = z.array(z.string().trim()).default([]);

export const TableFieldOrderFormSchema = z.array(z.string().trim()).default([]);

export const TableFieldOrderFilterSchema = z
  .array(z.string().trim())
  .default([]);

export const TableFieldOrderDetailSchema = z
  .array(z.string().trim())
  .default([]);

export const TableOrderSchema = z
  .object({
    field: z.string().trim(),
    direction: z.enum(['asc', 'desc']),
  })
  .nullable()
  .default(null);

export const TableLayoutFieldsSchema = z.object({
  title: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  cover: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  startDate: z.string().nullable().default(null),
  endDate: z.string().nullable().default(null),
  color: z.string().nullable().default(null),
  participants: z.string().nullable().default(null),
  reminder: z.string().nullable().default(null),
});

export const TableMethodSchema = z.object({
  beforeSave: z.object({
    code: z.string().trim().nullable(),
  }),
  afterSave: z.object({
    code: z.string().trim().nullable(),
  }),
  onLoad: z.object({
    code: z.string().trim().nullable(),
  }),
});
