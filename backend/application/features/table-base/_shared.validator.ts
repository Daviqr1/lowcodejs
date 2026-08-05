import z from 'zod';

import {
  E_SORT_DIRECTION,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_PERMISSION,
  E_TABLE_PROFILE,
  E_TABLE_STYLE,
  type Merge,
} from '@application/core/entity.core';
import {
  boolFlag,
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
  trashed: boolFlag(),
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
      profile: z.enum(E_TABLE_PROFILE),
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
  .enum(E_TABLE_STYLE)
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
    direction: z.enum(E_SORT_DIRECTION),
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

// ── Importacao de schema ──────────────────────────────────────────────
// Vinha de `schema-import/schema-import.validator.ts`, o ultimo validator por
// operacao numa fatia que ja tinha `_shared`.

const FIELD_FORMAT_KEY_TO_VALUE: Record<string, string> = E_FIELD_FORMAT;

const FieldFormatSchema = z
  .union([z.string(), z.null()])
  .nullable()
  .optional()
  .default(null)
  .transform((value) => {
    if (value === null || value === undefined) return null;
    // aceita "DD_MM_YYYY" (chave) ou "dd/MM/yyyy" (valor)
    if (value in FIELD_FORMAT_KEY_TO_VALUE) {
      return FIELD_FORMAT_KEY_TO_VALUE[value];
    }
    return value;
  })
  .pipe(z.enum(E_FIELD_FORMAT).nullable());

const IMPORTABLE_FIELD_TYPES = [
  E_FIELD_TYPE.TEXT_SHORT,
  E_FIELD_TYPE.TEXT_LONG,
  E_FIELD_TYPE.DATE,
  E_FIELD_TYPE.DROPDOWN,
  E_FIELD_TYPE.FILE,
  E_FIELD_TYPE.USER,
  E_FIELD_TYPE.USER_GROUP,
  E_FIELD_TYPE.CATEGORY,
  E_FIELD_TYPE.RELATIONSHIP,
] as const;

const DropdownOptionSchema = z.object({
  label: z.string().trim().min(1),
  color: z.string().trim().nullable().optional(),
});

const RelationshipReferenceSchema = z.object({
  table: z.string().trim().min(1),
  field: z.string().trim().min(1),
  order: z.enum(E_SORT_DIRECTION).optional().default('asc'),
});

const SchemaImportFieldSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome do campo é obrigatório')
    .max(60, 'Nome do campo deve ter no máximo 60 caracteres'),
  type: z.enum(IMPORTABLE_FIELD_TYPES),
  required: z.boolean().optional().default(false),
  multiple: z.boolean().optional().default(false),
  format: FieldFormatSchema,
  showInList: z.boolean().optional().default(true),
  showInForm: z.boolean().optional().default(true),
  showInFilter: z.boolean().optional().default(false),
  showInDetail: z.boolean().optional().default(true),
  defaultValue: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional()
    .default(null),
  options: z.array(DropdownOptionSchema).optional().default([]),
  relationship: RelationshipReferenceSchema.nullable().optional().default(null),
});

const SchemaImportTableSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome da tabela é obrigatório')
    .max(40, 'Nome da tabela deve ter no máximo 40 caracteres'),
  style: z.enum(E_TABLE_STYLE).optional(),
  fields: z
    .array(SchemaImportFieldSchema)
    .min(1, 'A tabela precisa de ao menos 1 campo')
    .max(100, 'Limite de 100 campos por tabela'),
});

export const SchemaImportPayloadValidator = z.object({
  tables: z
    .array(SchemaImportTableSchema)
    .min(1, 'É preciso declarar ao menos 1 tabela')
    .max(100, 'Limite de 100 tabelas por importação'),
});

export const SchemaImportBodyValidator = z.object({
  yaml: z
    .string()
    .trim()
    .min(1, 'O conteúdo YAML é obrigatório')
    .max(5 * 1024 * 1024, 'O conteúdo YAML excede o limite de 5 MB'),
});

export type SchemaImportBody = z.infer<typeof SchemaImportBodyValidator>;
export type SchemaImportPayload = z.infer<typeof SchemaImportPayloadValidator>;
export type SchemaImportTable = z.infer<typeof SchemaImportTableSchema>;
export type SchemaImportField = z.infer<typeof SchemaImportFieldSchema>;
