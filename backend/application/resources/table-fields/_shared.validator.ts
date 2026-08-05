import z from 'zod';

import {
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_FIELD_VALIDATION,
  E_PERMISSION_TARGET,
  E_RELATIONSHIP_ON_DELETE,
  type ICategory,
  type IFieldValidation,
  type Merge,
} from '@application/core/entity.core';
import {
  NAME_MAX_LENGTH,
  SLUG_MAX_LENGTH,
} from '@application/core/field-rules.core';
import { slugIdParams } from '@application/resources/_shared.validator';

/**
 * Entrada da fatia `table-fields`. Fonte unica — os `*.schema.ts` derivam daqui
 * o JSON Schema da rota com `zodToRouteSchema`.
 *
 * Absorve o antigo `table-field-base.schema.ts`, que ja era este arquivo com
 * nome enganoso: guardava blocos Zod de entrada, nao schema de resposta.
 *
 * Cinco operacoes so apelidavam o `slugIdParams()` do core; o apelido
 * some e elas passam a usar o bloco direto.
 */

/** `:slug` da tabela — rotas que ainda nao apontam um campo. */
export const TableSlugParamsValidator = z.object({
  slug: z.string().trim(),
});

/** `:slug` + `:_id`: tabela + campo. Vem do core, reexportado pela fatia. */
export const TableFieldParamsValidator = slugIdParams();

export type TableFieldShowPayload = z.infer<typeof TableFieldParamsValidator>;
export type TableFieldSendToTrashPayload = z.infer<
  typeof TableFieldParamsValidator
>;
export type TableFieldRemoveFromTrashPayload = z.infer<
  typeof TableFieldParamsValidator
>;

// Binding de visibilidade do campo num contexto (Grupo|Public|Nobody).
const FieldPermissionBindingSchema = z.object({
  kind: z.enum([
    E_PERMISSION_TARGET.PUBLIC,
    E_PERMISSION_TARGET.NOBODY,
    E_PERMISSION_TARGET.GROUP,
  ]),
  group: z.string().trim().nullable().default(null),
});

// Visibilidade do campo por contexto (lista/formulario/detalhe).
export const FieldPermissionsSchema = z
  .object({
    list: FieldPermissionBindingSchema,
    form: FieldPermissionBindingSchema,
    detail: FieldPermissionBindingSchema,
  })
  .nullable()
  .optional();

// Arvore recursiva de categorias (ICategory). `z.lazy` + anotacao explicita
// permitem que `children` seja tipado como ICategory[] em vez de unknown[].
const Category: z.ZodType<ICategory> = z.lazy(() =>
  z.object({
    id: z.string().trim(),
    label: z.string().trim(),
    children: z.array(Category).default([]),
  }),
);

const RelationshipLabelPart = z.object({
  path: z.string().trim().min(1),
  label: z.string().trim().optional(),
});

const Relationship = z.object({
  table: z.object({
    _id: z.string().trim(),
    slug: z.string().trim(),
  }),
  field: z.object({
    _id: z.string().trim(),
    slug: z.string().trim(),
  }),
  order: z.enum(['asc', 'desc']).default('asc'),
  customLabel: z.boolean().optional(),
  labelParts: z.array(RelationshipLabelPart).optional(),
  labelSeparator: z.string().optional(),
  // Config por lado (pivô): onDelete + visibilidade do source + lado espelho.
  visible: z.boolean().optional(),
  onDelete: z.enum(E_RELATIONSHIP_ON_DELETE).optional(),
  mirror: z
    .object({
      multiple: z.boolean().default(false),
      visible: z.boolean().default(false),
      label: z.string().trim().optional(),
    })
    .optional(),
  // Back-pointer para a RelationshipDefinition (pivô) e lado deste endpoint.
  // Materializados no backend (born-pivot); expostos para a UI saber gerir o vínculo.
  relationshipId: z.string().trim().nullable().optional(),
  side: z.enum(['source', 'target']).nullable().optional(),
  // Modo no formulário: select (multi-select) | manage (tabelas internas).
  formMode: z.enum(['select', 'manage']).optional(),
  // Limite numerico de vinculos neste lado (null = ilimitado, so para multiple).
  max: z.number().int().positive().nullable().optional(),
});

const Dropdown = z.object({
  id: z.string().trim(),
  label: z.string().trim(),
  color: z.string().nullable().optional(),
  sortField: z.string().nullable().optional(),
  sortDirection: z.enum(['asc', 'desc']).nullable().optional(),
});

// Regra de validacao configurada no campo: { rule, config }. `config` carrega os
// parametros da regra (range → { min, max }; is-not → { values }); vazio para
// regras sem parametro.
const Validation = z.object({
  rule: z.enum(E_FIELD_VALIDATION),
  config: z
    .record(z.string(), z.unknown())
    .nullish()
    .transform((value) => value ?? {}),
});
// Aceita null/undefined (clientes que reenviam o campo cru do GET) → [].
export const FieldValidationsSchema = z
  .array(Validation)
  .nullish()
  .transform((value) => value ?? []);

// Propriedades flat do campo (não aninhadas em configuration)
export const FieldRequiredSchema = z.boolean().default(false);
export const FieldMultipleSchema = z.boolean().default(false);
export const FieldFormatSchema = z
  .enum(E_FIELD_FORMAT)
  .nullable()
  .default(null);
// Exibe o campo na barra de filtros (config de UX, nao e permissao).
export const FieldShowInFilterSchema = z.boolean().default(false);
// Campos-filho de FIELD_GROUP: elegibilidade + visibilidade na listagem geral
// da tabela pai (nao e permissao; ver IField em entity.core.ts). Opcionais:
// Mongoose aplica default false e o schema Fastify coage no body HTTP.
export const FieldShowInParentListSchema = z.boolean().optional();
export const FieldVisibleInParentListSchema = z.boolean().optional();
export const FieldWidthInFormSchema = z.number().min(0).nullable().default(50);
export const FieldWidthInListSchema = z.number().min(0).nullable().default(10);
export const FieldWidthInDetailSchema = z
  .number()
  .min(0)
  .nullable()
  .default(50);
// Limite de chips exibidos antes de resumir o restante em "+N" — aplicavel aos
// campos DROPDOWN, RELATIONSHIP e USER quando multiple. null = sem limite,
// exibe todos os selecionados.
export const FieldVisibleChipsLimitSchema = z
  .number()
  .int()
  .positive()
  .nullable()
  .default(null);
export const FieldTipSchema = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .default(null)
  .transform((value) => {
    if (value && value.length > 0) return value;
    return null;
  });
export const FieldHtmlContentSchema = z
  .string()
  .trim()
  .nullable()
  .default(null);
export const FieldLockedSchema = z.boolean().default(false);
// Rotulo customizado por contexto. SEM default no objeto: ausente permanece
// `undefined` para que callers que omitem `label` (ex.: toggle de visibilidade)
// nunca apaguem os rotulos existentes. Contexto vazio → null (usa o name).
const FieldLabelContextSchema = z
  .string()
  .trim()
  .max(120)
  .nullable()
  .optional()
  .transform((v) => {
    if (v && v.length > 0) return v;
    return null;
  });

export const FieldLabelSchema = z
  .object({
    list: FieldLabelContextSchema,
    filter: FieldLabelContextSchema,
    form: FieldLabelContextSchema,
    detail: FieldLabelContextSchema,
  })
  .nullable()
  .optional();
export const FieldDefaultValueSchema = z
  .union([z.string(), z.array(z.string())])
  .nullable()
  .default(null);
export const FieldRelationshipSchema = Relationship.nullable().default(null);
// Aceita null além de undefined: alguns clientes (ex.: Kanban) reenviam o campo
// cru do GET, onde dropdown/category vêm como null, e normaliza para [].
export const FieldDropdownSchema = z
  .array(Dropdown)
  .nullish()
  .transform((value) => value ?? []);
export const FieldAllowCustomDropdownOptionsSchema = z.boolean().default(false);
export const FieldAllowCreateRelationshipRecordsSchema = z
  .boolean()
  .default(false);
export const FieldFillWithCurrentUserWhenEmptySchema = z
  .boolean()
  .default(false);
export const FieldCategorySchema = z
  .array(Category)
  .nullish()
  .transform((value) => value ?? []);
// For API input: can be just a slug string or the full object
export const FieldGroupSchema = z
  .union([
    z.string().trim(),
    z.object({
      _id: z
        .string()
        .trim()
        .nullish()
        .transform((v) => v || undefined)
        .optional(),

      slug: z.string().trim(),
    }),
  ])
  .nullable()
  .default(null);

// Schema para body de criação/atualização de campos
export const TableFieldBaseSchema = z.object({
  required: FieldRequiredSchema,
  multiple: FieldMultipleSchema,
  format: FieldFormatSchema,
  validations: FieldValidationsSchema,
  showInFilter: FieldShowInFilterSchema,
  showInParentList: FieldShowInParentListSchema,
  visibleInParentList: FieldVisibleInParentListSchema,
  permissions: FieldPermissionsSchema,
  widthInForm: FieldWidthInFormSchema,
  widthInList: FieldWidthInListSchema,
  widthInDetail: FieldWidthInDetailSchema,
  visibleChipsLimit: FieldVisibleChipsLimitSchema,
  tip: FieldTipSchema,
  htmlContent: FieldHtmlContentSchema,
  locked: FieldLockedSchema,
  label: FieldLabelSchema,
  defaultValue: FieldDefaultValueSchema,
  relationship: FieldRelationshipSchema,
  dropdown: FieldDropdownSchema,
  allowCustomDropdownOptions: FieldAllowCustomDropdownOptionsSchema,
  allowCreateRelationshipRecords: FieldAllowCreateRelationshipRecordsSchema,
  fillWithCurrentUserWhenEmpty: FieldFillWithCurrentUserWhenEmptySchema,
  category: FieldCategorySchema,
  group: FieldGroupSchema,
});

// ── Create e update ───────────────────────────────────────────────────

export const TableFieldCreateBodyValidator = z
  .object({
    name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
    slug: z.string().trim().max(SLUG_MAX_LENGTH).optional(),
    type: z.enum(E_FIELD_TYPE),
  })
  .merge(TableFieldBaseSchema);

/** Campos que o use-case recebe com outra forma do que o Zod devolve. */
type FieldPayloadOverrides = {
  slug?: string;
  tableSlug?: string;
  allowCustomDropdownOptions?: boolean;
  fillWithCurrentUserWhenEmpty?: boolean;
  tip?: string | null;
  htmlContent?: string | null;
  // Opcional no tipo (specs/clients podem omitir); runtime sempre [] via zod.
  validations?: IFieldValidation[];
  // Opcional no tipo (specs/clients podem omitir); runtime sempre null via zod.
  visibleChipsLimit?: number | null;
};

type OverriddenKeys =
  | 'allowCustomDropdownOptions'
  | 'fillWithCurrentUserWhenEmpty'
  | 'tip'
  | 'htmlContent'
  | 'slug'
  | 'validations'
  | 'visibleChipsLimit';

export type TableFieldCreatePayload = Merge<
  Omit<z.infer<typeof TableFieldCreateBodyValidator>, OverriddenKeys>,
  FieldPayloadOverrides
>;

// slug e opcional: campos nao-nativos podem editar a "url"/chave tecnica do
// campo (honrado no use-case). Campos nativos nao enviam slug (slug camelCase
// fixo) e o use-case os ignora.
export const TableFieldUpdateBodyValidator = z
  .object({
    name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
    slug: z.string().trim().max(SLUG_MAX_LENGTH).optional(),
    type: z.enum(E_FIELD_TYPE),
    trashed: z.boolean().default(false),
    trashedAt: z
      .string()
      .nullable()
      .default(null)
      .transform((value) => {
        if (value) return new Date(value);
        return null;
      }),
  })
  .merge(TableFieldBaseSchema);

export type TableFieldUpdatePayload = Merge<
  Omit<z.infer<typeof TableFieldUpdateBodyValidator>, OverriddenKeys>,
  Merge<FieldPayloadOverrides, { _id: string }>
>;

// ── Exclusao ──────────────────────────────────────────────────────────

export const TableFieldDeleteQueryValidator = z.object({
  group: z.string().trim().optional(),
});

export type TableFieldDeletePayload = Merge<
  z.infer<typeof TableFieldParamsValidator>,
  z.infer<typeof TableFieldDeleteQueryValidator>
>;

// ── Categorias ────────────────────────────────────────────────────────

export const TableFieldAddCategoryBodyValidator = z.object({
  label: z.string().trim().min(1),
  parentId: z.string().trim().nullable().optional(),
});

export type TableFieldAddCategoryPayload = Merge<
  z.infer<typeof TableFieldParamsValidator>,
  z.infer<typeof TableFieldAddCategoryBodyValidator>
>;

export const TableFieldDeleteCategoryParamsValidator = slugIdParams().extend({
  categoryId: z.string().trim().min(1),
});

export type TableFieldDeleteCategoryPayload = z.infer<
  typeof TableFieldDeleteCategoryParamsValidator
>;

// ── Sugestao de slug ──────────────────────────────────────────────────

export const TableFieldSuggestSlugBodyValidator = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
});

export type TableFieldSuggestSlugPayload = {
  tableSlug: string;
  name: string;
};
