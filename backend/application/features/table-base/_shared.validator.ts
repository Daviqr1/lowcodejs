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
function tableName(): z.ZodString {
  return z
    .string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(40, 'Nome deve ter no máximo 40 caracteres')
    .regex(
      /^[a-zA-ZáàâãéèêíïóôõöúçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ0-9\s\-_]+$/,
      'Nome pode conter apenas letras, números, espaços, hífen, underscore e ç',
    );
}

/** Busca e ordenacao comuns a listar e exportar. */
function tableFilterQuery(): z.ZodObject<
  {
    search: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    trashed: z.ZodOptional<
      z.ZodPreprocess<
        z.ZodPipe<
          z.ZodEnum<{
            true: 'true';
            false: 'false';
          }>,
          z.ZodTransform<boolean, 'true' | 'false'>
        >
      >
    >;
    'order-name': z.ZodOptional<
      z.ZodEnum<{
        readonly ASC: 'asc';
        readonly DESC: 'desc';
      }>
    >;
    'order-link': z.ZodOptional<
      z.ZodEnum<{
        readonly ASC: 'asc';
        readonly DESC: 'desc';
      }>
    >;
    'order-created-at': z.ZodOptional<
      z.ZodEnum<{
        readonly ASC: 'asc';
        readonly DESC: 'desc';
      }>
    >;
    'order-owner': z.ZodOptional<
      z.ZodEnum<{
        readonly ASC: 'asc';
        readonly DESC: 'desc';
      }>
    >;
  },
  z.core.$strip
> {
  return z.object({
    search: search(),
    name: z.string().trim().optional(),
    trashed: boolFlag(),
    'order-name': sortDirection(),
    'order-link': sortDirection(),
    'order-created-at': sortDirection(),
    'order-owner': sortDirection(),
  });
}

// Mapa das 10 acoes -> binding. Todas opcionais.
function tablePermissions(): z.ZodObject<
  {
    VIEW_TABLE: z.ZodOptional<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            PUBLIC: 'PUBLIC';
            NOBODY: 'NOBODY';
            GROUP: 'GROUP';
          }>;
          group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
    UPDATE_TABLE: z.ZodOptional<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            PUBLIC: 'PUBLIC';
            NOBODY: 'NOBODY';
            GROUP: 'GROUP';
          }>;
          group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
    CREATE_FIELD: z.ZodOptional<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            PUBLIC: 'PUBLIC';
            NOBODY: 'NOBODY';
            GROUP: 'GROUP';
          }>;
          group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
    UPDATE_FIELD: z.ZodOptional<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            PUBLIC: 'PUBLIC';
            NOBODY: 'NOBODY';
            GROUP: 'GROUP';
          }>;
          group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
    REMOVE_FIELD: z.ZodOptional<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            PUBLIC: 'PUBLIC';
            NOBODY: 'NOBODY';
            GROUP: 'GROUP';
          }>;
          group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
    VIEW_FIELD: z.ZodOptional<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            PUBLIC: 'PUBLIC';
            NOBODY: 'NOBODY';
            GROUP: 'GROUP';
          }>;
          group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
    CREATE_ROW: z.ZodOptional<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            PUBLIC: 'PUBLIC';
            NOBODY: 'NOBODY';
            GROUP: 'GROUP';
          }>;
          group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
    UPDATE_ROW: z.ZodOptional<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            PUBLIC: 'PUBLIC';
            NOBODY: 'NOBODY';
            GROUP: 'GROUP';
          }>;
          group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
    REMOVE_ROW: z.ZodOptional<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            PUBLIC: 'PUBLIC';
            NOBODY: 'NOBODY';
            GROUP: 'GROUP';
          }>;
          group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
    VIEW_ROW: z.ZodOptional<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            PUBLIC: 'PUBLIC';
            NOBODY: 'NOBODY';
            GROUP: 'GROUP';
          }>;
          group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
> {
  return z
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
}

export const TablePermissionsSchema = tablePermissions();

// Convidados da tabela e seus perfis.
function tableMembers(): z.ZodDefault<
  z.ZodArray<
    z.ZodObject<
      {
        user: z.ZodString;
        profile: z.ZodEnum<{
          readonly OWNER: 'OWNER';
          readonly ADMIN: 'ADMIN';
          readonly EDITOR: 'EDITOR';
          readonly CONTRIBUTOR: 'CONTRIBUTOR';
          readonly VIEWER: 'VIEWER';
        }>;
      },
      z.core.$strip
    >
  >
> {
  return z
    .array(
      z.object({
        user: z.string().trim().min(1),
        profile: z.enum(E_TABLE_PROFILE),
      }),
    )
    .default([]);
}

export const TableMembersSchema = tableMembers();

function groupConfiguration(): z.ZodObject<
  {
    slug: z.ZodString;
    name: z.ZodString;
    fields: z.ZodDefault<z.ZodArray<z.ZodAny>>;
    _schema: z.ZodDefault<z.ZodAny>;
  },
  z.core.$strip
> {
  return z.object({
    slug: z.string().trim(),
    name: z.string().trim(),
    fields: z.array(z.any()).default([]),
    _schema: z.any().default({}),
  });
}

export const GroupConfigurationSchema = groupConfiguration();

function tableStyle(): z.ZodDefault<
  z.ZodEnum<{
    readonly LIST: 'LIST';
    readonly GALLERY: 'GALLERY';
    readonly DOCUMENT: 'DOCUMENT';
    readonly CARD: 'CARD';
    readonly MOSAIC: 'MOSAIC';
    readonly KANBAN: 'KANBAN';
    readonly FORUM: 'FORUM';
    readonly CALENDAR: 'CALENDAR';
    readonly GANTT: 'GANTT';
  }>
> {
  return z.enum(E_TABLE_STYLE).default(E_TABLE_STYLE.LIST);
}

export const TableStyleSchema = tableStyle();

function tableFieldOrderList(): z.ZodDefault<z.ZodArray<z.ZodString>> {
  return z.array(z.string().trim()).default([]);
}

export const TableFieldOrderListSchema = tableFieldOrderList();

function tableFieldOrderForm(): z.ZodDefault<z.ZodArray<z.ZodString>> {
  return z.array(z.string().trim()).default([]);
}

export const TableFieldOrderFormSchema = tableFieldOrderForm();

function tableFieldOrderFilter(): z.ZodDefault<z.ZodArray<z.ZodString>> {
  return z.array(z.string().trim()).default([]);
}

export const TableFieldOrderFilterSchema = tableFieldOrderFilter();

function tableFieldOrderDetail(): z.ZodDefault<z.ZodArray<z.ZodString>> {
  return z.array(z.string().trim()).default([]);
}

export const TableFieldOrderDetailSchema = tableFieldOrderDetail();

function tableOrder(): z.ZodDefault<
  z.ZodNullable<
    z.ZodObject<
      {
        field: z.ZodString;
        direction: z.ZodEnum<{
          readonly ASC: 'asc';
          readonly DESC: 'desc';
        }>;
      },
      z.core.$strip
    >
  >
> {
  return z
    .object({
      field: z.string().trim(),
      direction: z.enum(E_SORT_DIRECTION),
    })
    .nullable()
    .default(null);
}

export const TableOrderSchema = tableOrder();

function tableLayoutFields(): z.ZodObject<
  {
    title: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    description: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    cover: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    category: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    startDate: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    endDate: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    color: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    participants: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    reminder: z.ZodDefault<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> {
  return z.object({
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
}

export const TableLayoutFieldsSchema = tableLayoutFields();

function tableMethod(): z.ZodObject<
  {
    beforeSave: z.ZodObject<
      {
        code: z.ZodNullable<z.ZodString>;
      },
      z.core.$strip
    >;
    afterSave: z.ZodObject<
      {
        code: z.ZodNullable<z.ZodString>;
      },
      z.core.$strip
    >;
    onLoad: z.ZodObject<
      {
        code: z.ZodNullable<z.ZodString>;
      },
      z.core.$strip
    >;
  },
  z.core.$strip
> {
  return z.object({
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
}

export const TableMethodSchema = tableMethod();

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
    name: tableName(),
    slug: z.string().trim().min(1).optional(),
    logo: z.string().trim().nullable().optional(),
    style: tableStyle().optional(),
  })
  .transform(withNormalizedSlug);

/** `owner` vem da sessao, nunca do body. */
export type TableCreatePayload = Merge<
  z.infer<typeof TableCreateBodyValidator>,
  { owner: string }
>;

export const TableUpdateBodyValidator = z
  .object({
    name: tableName(),
    slug: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable(),
    logo: z.string().trim().nullable(),
    style: tableStyle(),
    fieldOrderList: tableFieldOrderList(),
    fieldOrderForm: tableFieldOrderForm(),
    fieldOrderFilter: tableFieldOrderFilter(),
    fieldOrderDetail: tableFieldOrderDetail(),
    methods: tableMethod(),
    order: tableOrder(),
    layoutFields: tableLayoutFields().optional(),
    groups: z.array(groupConfiguration()).optional(),
    rowSlugFieldId: z.string().trim().nullable().optional(),
    // Permissoes (Grupo|Public|Nobody por acao) + convidados + troca de dono.
    permissions: tablePermissions().optional(),
    members: tableMembers().optional(),
    owner: z.string().trim().min(1).optional(),
  })
  .transform(withNormalizedSlug);

/** `routeSlug` e o `:slug` da rota; o `slug` do body e o novo valor. */
export type TableUpdatePayload = Merge<
  z.infer<typeof TableUpdateBodyValidator>,
  { routeSlug: string }
>;

// ── Leitura ───────────────────────────────────────────────────────────

export const TablePaginatedQueryValidator = tableFilterQuery().extend({
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

export const TableExportCsvQueryValidator = tableFilterQuery().extend({
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

function fieldFormat(): z.ZodPipe<
  z.ZodPipe<
    z.ZodDefault<
      z.ZodOptional<
        z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>
      >
    >,
    z.ZodTransform<string | null, string | null>
  >,
  z.ZodNullable<
    z.ZodEnum<{
      readonly ALPHA_NUMERIC: 'ALPHA_NUMERIC';
      readonly INTEGER: 'INTEGER';
      readonly DECIMAL: 'DECIMAL';
      readonly URL: 'URL';
      readonly EMAIL: 'EMAIL';
      readonly PASSWORD: 'PASSWORD';
      readonly PHONE: 'PHONE';
      readonly CNPJ: 'CNPJ';
      readonly CPF: 'CPF';
      readonly RICH_TEXT: 'RICH_TEXT';
      readonly PLAIN_TEXT: 'PLAIN_TEXT';
      readonly DD_MM_YYYY: 'dd/MM/yyyy';
      readonly MM_DD_YYYY: 'MM/dd/yyyy';
      readonly YYYY_MM_DD: 'yyyy/MM/dd';
      readonly DD_MM_YYYY_HH_MM_SS: 'dd/MM/yyyy HH:mm:ss';
      readonly MM_DD_YYYY_HH_MM_SS: 'MM/dd/yyyy HH:mm:ss';
      readonly YYYY_MM_DD_HH_MM_SS: 'yyyy/MM/dd HH:mm:ss';
      readonly DD_MM_YYYY_DASH: 'dd-MM-yyyy';
      readonly MM_DD_YYYY_DASH: 'MM-dd-yyyy';
      readonly YYYY_MM_DD_DASH: 'yyyy-MM-dd';
      readonly DD_MM_YYYY_HH_MM_SS_DASH: 'dd-MM-yyyy HH:mm:ss';
      readonly MM_DD_YYYY_HH_MM_SS_DASH: 'MM-dd-yyyy HH:mm:ss';
      readonly YYYY_MM_DD_HH_MM_SS_DASH: 'yyyy-MM-dd HH:mm:ss';
    }>
  >
> {
  return z
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
}

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

function dropdownOption(): z.ZodObject<
  {
    label: z.ZodString;
    color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> {
  return z.object({
    label: z.string().trim().min(1),
    color: z.string().trim().nullable().optional(),
  });
}

function relationshipReference(): z.ZodObject<
  {
    table: z.ZodString;
    field: z.ZodString;
    order: z.ZodDefault<
      z.ZodOptional<
        z.ZodEnum<{
          readonly ASC: 'asc';
          readonly DESC: 'desc';
        }>
      >
    >;
  },
  z.core.$strip
> {
  return z.object({
    table: z.string().trim().min(1),
    field: z.string().trim().min(1),
    order: z.enum(E_SORT_DIRECTION).optional().default('asc'),
  });
}

function schemaImportField(): z.ZodObject<
  {
    name: z.ZodString;
    type: z.ZodEnum<{
      TEXT_SHORT: 'TEXT_SHORT';
      TEXT_LONG: 'TEXT_LONG';
      DROPDOWN: 'DROPDOWN';
      DATE: 'DATE';
      RELATIONSHIP: 'RELATIONSHIP';
      FILE: 'FILE';
      CATEGORY: 'CATEGORY';
      USER: 'USER';
      USER_GROUP: 'USER_GROUP';
    }>;
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    multiple: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    format: z.ZodPipe<
      z.ZodPipe<
        z.ZodDefault<
          z.ZodOptional<
            z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>
          >
        >,
        z.ZodTransform<string | null, string | null>
      >,
      z.ZodNullable<
        z.ZodEnum<{
          readonly ALPHA_NUMERIC: 'ALPHA_NUMERIC';
          readonly INTEGER: 'INTEGER';
          readonly DECIMAL: 'DECIMAL';
          readonly URL: 'URL';
          readonly EMAIL: 'EMAIL';
          readonly PASSWORD: 'PASSWORD';
          readonly PHONE: 'PHONE';
          readonly CNPJ: 'CNPJ';
          readonly CPF: 'CPF';
          readonly RICH_TEXT: 'RICH_TEXT';
          readonly PLAIN_TEXT: 'PLAIN_TEXT';
          readonly DD_MM_YYYY: 'dd/MM/yyyy';
          readonly MM_DD_YYYY: 'MM/dd/yyyy';
          readonly YYYY_MM_DD: 'yyyy/MM/dd';
          readonly DD_MM_YYYY_HH_MM_SS: 'dd/MM/yyyy HH:mm:ss';
          readonly MM_DD_YYYY_HH_MM_SS: 'MM/dd/yyyy HH:mm:ss';
          readonly YYYY_MM_DD_HH_MM_SS: 'yyyy/MM/dd HH:mm:ss';
          readonly DD_MM_YYYY_DASH: 'dd-MM-yyyy';
          readonly MM_DD_YYYY_DASH: 'MM-dd-yyyy';
          readonly YYYY_MM_DD_DASH: 'yyyy-MM-dd';
          readonly DD_MM_YYYY_HH_MM_SS_DASH: 'dd-MM-yyyy HH:mm:ss';
          readonly MM_DD_YYYY_HH_MM_SS_DASH: 'MM-dd-yyyy HH:mm:ss';
          readonly YYYY_MM_DD_HH_MM_SS_DASH: 'yyyy-MM-dd HH:mm:ss';
        }>
      >
    >;
    showInList: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    showInForm: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    showInFilter: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    showInDetail: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    defaultValue: z.ZodDefault<
      z.ZodOptional<
        z.ZodNullable<
          z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>
        >
      >
    >;
    options: z.ZodDefault<
      z.ZodOptional<
        z.ZodArray<
          z.ZodObject<
            {
              label: z.ZodString;
              color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            },
            z.core.$strip
          >
        >
      >
    >;
    relationship: z.ZodDefault<
      z.ZodOptional<
        z.ZodNullable<
          z.ZodObject<
            {
              table: z.ZodString;
              field: z.ZodString;
              order: z.ZodDefault<
                z.ZodOptional<
                  z.ZodEnum<{
                    readonly ASC: 'asc';
                    readonly DESC: 'desc';
                  }>
                >
              >;
            },
            z.core.$strip
          >
        >
      >
    >;
  },
  z.core.$strip
> {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Nome do campo é obrigatório')
      .max(60, 'Nome do campo deve ter no máximo 60 caracteres'),
    type: z.enum(IMPORTABLE_FIELD_TYPES),
    required: z.boolean().optional().default(false),
    multiple: z.boolean().optional().default(false),
    format: fieldFormat(),
    showInList: z.boolean().optional().default(true),
    showInForm: z.boolean().optional().default(true),
    showInFilter: z.boolean().optional().default(false),
    showInDetail: z.boolean().optional().default(true),
    defaultValue: z
      .union([z.string(), z.array(z.string())])
      .nullable()
      .optional()
      .default(null),
    options: z.array(dropdownOption()).optional().default([]),
    relationship: relationshipReference().nullable().optional().default(null),
  });
}

function schemaImportTable(): z.ZodObject<
  {
    name: z.ZodString;
    style: z.ZodOptional<
      z.ZodEnum<{
        readonly LIST: 'LIST';
        readonly GALLERY: 'GALLERY';
        readonly DOCUMENT: 'DOCUMENT';
        readonly CARD: 'CARD';
        readonly MOSAIC: 'MOSAIC';
        readonly KANBAN: 'KANBAN';
        readonly FORUM: 'FORUM';
        readonly CALENDAR: 'CALENDAR';
        readonly GANTT: 'GANTT';
      }>
    >;
    fields: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          type: z.ZodEnum<{
            TEXT_SHORT: 'TEXT_SHORT';
            TEXT_LONG: 'TEXT_LONG';
            DROPDOWN: 'DROPDOWN';
            DATE: 'DATE';
            RELATIONSHIP: 'RELATIONSHIP';
            FILE: 'FILE';
            CATEGORY: 'CATEGORY';
            USER: 'USER';
            USER_GROUP: 'USER_GROUP';
          }>;
          required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
          multiple: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
          format: z.ZodPipe<
            z.ZodPipe<
              z.ZodDefault<
                z.ZodOptional<
                  z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>
                >
              >,
              z.ZodTransform<string | null, string | null>
            >,
            z.ZodNullable<
              z.ZodEnum<{
                readonly ALPHA_NUMERIC: 'ALPHA_NUMERIC';
                readonly INTEGER: 'INTEGER';
                readonly DECIMAL: 'DECIMAL';
                readonly URL: 'URL';
                readonly EMAIL: 'EMAIL';
                readonly PASSWORD: 'PASSWORD';
                readonly PHONE: 'PHONE';
                readonly CNPJ: 'CNPJ';
                readonly CPF: 'CPF';
                readonly RICH_TEXT: 'RICH_TEXT';
                readonly PLAIN_TEXT: 'PLAIN_TEXT';
                readonly DD_MM_YYYY: 'dd/MM/yyyy';
                readonly MM_DD_YYYY: 'MM/dd/yyyy';
                readonly YYYY_MM_DD: 'yyyy/MM/dd';
                readonly DD_MM_YYYY_HH_MM_SS: 'dd/MM/yyyy HH:mm:ss';
                readonly MM_DD_YYYY_HH_MM_SS: 'MM/dd/yyyy HH:mm:ss';
                readonly YYYY_MM_DD_HH_MM_SS: 'yyyy/MM/dd HH:mm:ss';
                readonly DD_MM_YYYY_DASH: 'dd-MM-yyyy';
                readonly MM_DD_YYYY_DASH: 'MM-dd-yyyy';
                readonly YYYY_MM_DD_DASH: 'yyyy-MM-dd';
                readonly DD_MM_YYYY_HH_MM_SS_DASH: 'dd-MM-yyyy HH:mm:ss';
                readonly MM_DD_YYYY_HH_MM_SS_DASH: 'MM-dd-yyyy HH:mm:ss';
                readonly YYYY_MM_DD_HH_MM_SS_DASH: 'yyyy-MM-dd HH:mm:ss';
              }>
            >
          >;
          showInList: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
          showInForm: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
          showInFilter: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
          showInDetail: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
          defaultValue: z.ZodDefault<
            z.ZodOptional<
              z.ZodNullable<
                z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>
              >
            >
          >;
          options: z.ZodDefault<
            z.ZodOptional<
              z.ZodArray<
                z.ZodObject<
                  {
                    label: z.ZodString;
                    color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                  },
                  z.core.$strip
                >
              >
            >
          >;
          relationship: z.ZodDefault<
            z.ZodOptional<
              z.ZodNullable<
                z.ZodObject<
                  {
                    table: z.ZodString;
                    field: z.ZodString;
                    order: z.ZodDefault<
                      z.ZodOptional<
                        z.ZodEnum<{
                          readonly ASC: 'asc';
                          readonly DESC: 'desc';
                        }>
                      >
                    >;
                  },
                  z.core.$strip
                >
              >
            >
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
> {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Nome da tabela é obrigatório')
      .max(40, 'Nome da tabela deve ter no máximo 40 caracteres'),
    style: z.enum(E_TABLE_STYLE).optional(),
    fields: z
      .array(schemaImportField())
      .min(1, 'A tabela precisa de ao menos 1 campo')
      .max(100, 'Limite de 100 campos por tabela'),
  });
}

export const SchemaImportPayloadValidator = z.object({
  tables: z
    .array(schemaImportTable())
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
export type SchemaImportTable = z.infer<ReturnType<typeof schemaImportTable>>;
export type SchemaImportField = z.infer<ReturnType<typeof schemaImportField>>;
