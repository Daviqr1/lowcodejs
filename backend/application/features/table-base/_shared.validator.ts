import z from 'zod';

import {
  E_TABLE_PERMISSION,
  E_TABLE_PROFILE,
  E_TABLE_STYLE,
  type Merge,
} from '@application/core/entity.core';
import {
  bulkIds,
  pagination,
  permissionBinding,
  search,
  sortDirection,
} from '@application/features/_shared.validator';
import SlugService from '@application/services/slug/slug.service';

/**
 * Entrada da fatia `table-base`. Fonte unica — os `*.schema.ts` derivam daqui
 * o JSON Schema da rota com `zodToRouteSchema`.
 *
 * Absorve o antigo `table-base.schema.ts`, que ja era este arquivo com nome
 * enganoso: guardava blocos Zod de entrada, nao schema de resposta.
 *
 * Schemas de escopo de modulo: avaliados no import, quando o container de DI
 * ainda nao existe. O SlugService e puro (constructor sem argumentos).
 */
const slugService = new SlugService();

/** `:slug` da tabela. Antes copiado em 5 operacoes. */
export const TableSlugParamsValidator = z.object({
  slug: z.string().trim(),
});

export type TableShowPayload = z.infer<typeof TableSlugParamsValidator>;
export type TableDeletePayload = z.infer<typeof TableSlugParamsValidator>;
export type TableSendToTrashPayload = z.infer<typeof TableSlugParamsValidator>;
export type TableRemoveFromTrashPayload = z.infer<
  typeof TableSlugParamsValidator
>;

/** Nome de tabela: mesmo formato em create e update. */
const TableNameValidator = z
  .string()
  .trim()
  .min(1, 'Nome é obrigatório')
  .max(40, 'Nome deve ter no máximo 40 caracteres')
  .regex(
    /^[a-zA-ZáàâãéèêíïóôõöúçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ0-9\s\-_]+$/,
    'Nome pode conter apenas letras, números, espaços, hífen, underscore e ç',
  );

/** Busca e ordenacao comuns a listar e exportar. */
const TableFilterQueryValidator = z.object({
  search: search(),
  name: z.string().trim().optional(),
  trashed: z.string().trim().optional(),
  'order-name': sortDirection(),
  'order-link': sortDirection(),
  'order-created-at': sortDirection(),
  'order-owner': sortDirection(),
});

// Mapa das 10 acoes -> binding. Todas opcionais.
export const TablePermissionsSchema = z
  .object({
    [E_TABLE_PERMISSION.VIEW_TABLE]: permissionBinding(),
    [E_TABLE_PERMISSION.UPDATE_TABLE]: permissionBinding(),
    [E_TABLE_PERMISSION.CREATE_FIELD]: permissionBinding(),
    [E_TABLE_PERMISSION.UPDATE_FIELD]: permissionBinding(),
    [E_TABLE_PERMISSION.REMOVE_FIELD]: permissionBinding(),
    [E_TABLE_PERMISSION.VIEW_FIELD]: permissionBinding(),
    [E_TABLE_PERMISSION.CREATE_ROW]: permissionBinding(),
    [E_TABLE_PERMISSION.UPDATE_ROW]: permissionBinding(),
    [E_TABLE_PERMISSION.REMOVE_ROW]: permissionBinding(),
    [E_TABLE_PERMISSION.VIEW_ROW]: permissionBinding(),
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

// ── Create e update ───────────────────────────────────────────────────

/**
 * Normaliza o slug ANTES das regras: o body pode mandar `slug` explicito e,
 * na ausencia dele, ele sai do nome. Estava copiado em create e update.
 */
function withNormalizedSlug<T extends { name: string; slug?: string }>(
  data: T,
): Merge<T, { slug: string }> {
  let slug = slugService.normalize(data.name);
  if (data.slug) slug = slugService.normalize(data.slug);
  return { ...data, slug };
}

export const TableCreateBodyValidator = z
  .object({
    name: TableNameValidator,
    slug: z.string().trim().min(1).optional(),
    logo: z.string().trim().nullable().optional(),
    style: TableStyleSchema.optional(),
  })
  .transform(withNormalizedSlug);

/** `owner` vem da sessao, nunca do body. */
export type TableCreatePayload = Merge<
  z.infer<typeof TableCreateBodyValidator>,
  { owner: string }
>;

export const TableUpdateBodyValidator = z
  .object({
    name: TableNameValidator,
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
  .transform(withNormalizedSlug);

/** `routeSlug` e o `:slug` da rota; o `slug` do body e o novo valor. */
export type TableUpdatePayload = Merge<
  z.infer<typeof TableUpdateBodyValidator>,
  { routeSlug: string }
>;

// ── Leitura ───────────────────────────────────────────────────────────

export const TablePaginatedQueryValidator = TableFilterQueryValidator.extend({
  ...pagination().shape,
  owner: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const tokens = value
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);
      if (tokens.length === 0) return undefined;
      return tokens;
    })
    .pipe(z.array(z.string()).optional()),
});

export type TablePaginatedPayload = z.infer<
  typeof TablePaginatedQueryValidator
>;

export const TableExportCsvQueryValidator = TableFilterQueryValidator.extend({
  owner: z.string().trim().optional(),
});

export type TableExportCsvPayload = z.infer<
  typeof TableExportCsvQueryValidator
>;

// ── Operacoes em massa ────────────────────────────────────────────────

export const BulkIdsBodyValidator = z.object({
  ids: bulkIds(),
});

export type BulkTrashPayload = z.infer<typeof BulkIdsBodyValidator>;
export type BulkRestorePayload = z.infer<typeof BulkIdsBodyValidator>;
