import z from 'zod';

import {
  E_SORT_DIRECTION,
  E_FIELD_FORMAT,
  E_FIELD_VALIDATION,
  E_RELATIONSHIP_ON_DELETE,
  type ICategory,
  type IFieldValidation,
} from '@application/core/entity.core';
import { permissionBinding } from '@application/features/_shared.validator';

/**
 * Configuracao de um campo do low-code. Nivel GLOBAL do padrao `_shared`:
 * `table-fields` e `table-group-fields` validam o mesmo formulario — um campo
 * de grupo e um campo — e antes a segunda importava o `_shared` da primeira,
 * reuso lateral entre features.
 *
 * Mora em arquivo proprio, e nao no `_shared.validator.ts` da raiz, so por
 * tamanho: sao 26 blocos de configuracao que afogariam os primitivos
 * genericos (email, paginacao, identificador) do outro arquivo.
 */

// Visibilidade do campo por contexto (lista/formulario/detalhe).
export const FieldPermissionsSchema = z
  .object({
    list: permissionBinding(),
    form: permissionBinding(),
    detail: permissionBinding(),
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
  order: z.enum(E_SORT_DIRECTION).default('asc'),
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
  sortDirection: z.enum(E_SORT_DIRECTION).nullable().optional(),
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

/** Campos que o use-case recebe com outra forma do que o Zod devolve. */
export type FieldPayloadOverrides = {
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

/** As chaves que `FieldPayloadOverrides` substitui no tipo inferido. */
export type OverriddenKeys =
  | 'allowCustomDropdownOptions'
  | 'fillWithCurrentUserWhenEmpty'
  | 'tip'
  | 'htmlContent'
  | 'slug'
  | 'validations'
  | 'visibleChipsLimit';
