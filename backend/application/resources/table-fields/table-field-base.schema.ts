import z from 'zod';

import {
  E_FIELD_FORMAT,
  E_FIELD_VALIDATION,
  E_PERMISSION_TARGET,
  E_RELATIONSHIP_ON_DELETE,
  type ICategory,
} from '@application/core/entity.core';

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
export const FieldWidthInFormSchema = z.number().min(0).nullable().default(50);
export const FieldWidthInListSchema = z.number().min(0).nullable().default(10);
export const FieldWidthInDetailSchema = z
  .number()
  .min(0)
  .nullable()
  .default(50);
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

// Tipos que armazenam defaultValue como string[]
const ARRAY_DEFAULT_VALUE_TYPES = new Set([
  'DROPDOWN',
  'CATEGORY',
  'USER',
  'RELATIONSHIP',
]);

// Tipos que armazenam defaultValue como string
const STRING_DEFAULT_VALUE_TYPES = new Set(['TEXT_SHORT', 'TEXT_LONG', 'DATE']);

/**
 * Normaliza defaultValue para a estrutura correta baseado no tipo do campo:
 * - TEXT_SHORT, TEXT_LONG, DATE → string | null
 * - DROPDOWN, CATEGORY, USER, RELATIONSHIP → string[] | null
 * - Outros → null
 */
export function normalizeDefaultValue(
  type: string,
  defaultValue: string | string[] | null | undefined,
): string | string[] | null {
  if (defaultValue === null || defaultValue === undefined) return null;

  if (ARRAY_DEFAULT_VALUE_TYPES.has(type)) {
    if (Array.isArray(defaultValue)) {
      if (defaultValue.length > 0) return defaultValue;
      return null;
    }
    if (typeof defaultValue === 'string' && defaultValue) {
      return [defaultValue];
    }
    return null;
  }

  if (STRING_DEFAULT_VALUE_TYPES.has(type)) {
    if (typeof defaultValue === 'string' && defaultValue) {
      return defaultValue;
    }
    if (Array.isArray(defaultValue) && defaultValue.length > 0) {
      return defaultValue[0];
    }
    return null;
  }

  return null;
}

export function hasDuplicateDropdownLabels(
  dropdown: Array<{ label: string }> | null | undefined,
): boolean {
  if (!dropdown || dropdown.length === 0) return false;

  const labels = new Set<string>();

  for (const item of dropdown) {
    const label = item.label.trim().toLowerCase();
    if (labels.has(label)) return true;
    labels.add(label);
  }

  return false;
}

// Schema para body de criação/atualização de campos
export const TableFieldBaseSchema = z.object({
  required: FieldRequiredSchema,
  multiple: FieldMultipleSchema,
  format: FieldFormatSchema,
  validations: FieldValidationsSchema,
  showInFilter: FieldShowInFilterSchema,
  permissions: FieldPermissionsSchema,
  widthInForm: FieldWidthInFormSchema,
  widthInList: FieldWidthInListSchema,
  widthInDetail: FieldWidthInDetailSchema,
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
