import z from 'zod';

import {
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_FIELD_VALIDATION,
  E_SORT_DIRECTION,
  E_RELATIONSHIP_ON_DELETE,
  type ICategory,
  type IFieldValidation,
} from '@application/core/entity.core';
import {
  NAME_MAX_LENGTH,
  SLUG_MAX_LENGTH,
} from '@application/core/field-rules.core';
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

/**
 * Identidade do campo: nome, slug e tipo. Estava reescrita quatro vezes — no
 * create e no update de `table-fields` e de `table-group-fields`.
 */
export function fieldIdentity(): z.ZodObject<
  {
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<typeof E_FIELD_TYPE>;
  },
  z.core.$strip
> {
  return z.object({
    name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
    slug: z.string().trim().max(SLUG_MAX_LENGTH).optional(),
    type: z.enum(E_FIELD_TYPE),
  });
}

// Visibilidade do campo por contexto (lista/formulario/detalhe).
function fieldPermissions(): z.ZodOptional<
  z.ZodNullable<
    z.ZodObject<
      {
        list: z.ZodObject<
          {
            kind: z.ZodEnum<{
              PUBLIC: 'PUBLIC';
              NOBODY: 'NOBODY';
              GROUP: 'GROUP';
            }>;
            group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
          },
          z.core.$strip
        >;
        form: z.ZodObject<
          {
            kind: z.ZodEnum<{
              PUBLIC: 'PUBLIC';
              NOBODY: 'NOBODY';
              GROUP: 'GROUP';
            }>;
            group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
          },
          z.core.$strip
        >;
        detail: z.ZodObject<
          {
            kind: z.ZodEnum<{
              PUBLIC: 'PUBLIC';
              NOBODY: 'NOBODY';
              GROUP: 'GROUP';
            }>;
            group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
          },
          z.core.$strip
        >;
      },
      z.core.$strip
    >
  >
> {
  return z
    .object({
      list: permissionBinding(),
      form: permissionBinding(),
      detail: permissionBinding(),
    })
    .nullable()
    .optional();
}

export const FieldPermissionsSchema = fieldPermissions();

// Arvore recursiva de categorias (ICategory). `z.lazy` + anotacao explicita
// permitem que `children` seja tipado como ICategory[] em vez de unknown[].
const Category: z.ZodType<ICategory> = z.lazy(() =>
  z.object({
    id: z.string().trim(),
    label: z.string().trim(),
    children: z.array(Category).default([]),
  }),
);

function relationshipLabelPart(): z.ZodObject<
  {
    path: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
> {
  return z.object({
    path: z.string().trim().min(1),
    label: z.string().trim().optional(),
  });
}

function relationship(): z.ZodObject<
  {
    table: z.ZodObject<
      {
        _id: z.ZodString;
        slug: z.ZodString;
      },
      z.core.$strip
    >;
    field: z.ZodObject<
      {
        _id: z.ZodString;
        slug: z.ZodString;
      },
      z.core.$strip
    >;
    order: z.ZodDefault<
      z.ZodEnum<{
        readonly ASC: 'asc';
        readonly DESC: 'desc';
      }>
    >;
    customLabel: z.ZodOptional<z.ZodBoolean>;
    labelParts: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            path: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
          },
          z.core.$strip
        >
      >
    >;
    labelSeparator: z.ZodOptional<z.ZodString>;
    visible: z.ZodOptional<z.ZodBoolean>;
    onDelete: z.ZodOptional<
      z.ZodEnum<{
        readonly CASCADE: 'CASCADE';
        readonly SET_NULL: 'SET_NULL';
        readonly RESTRICT: 'RESTRICT';
      }>
    >;
    mirror: z.ZodOptional<
      z.ZodObject<
        {
          multiple: z.ZodDefault<z.ZodBoolean>;
          visible: z.ZodDefault<z.ZodBoolean>;
          label: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    relationshipId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    side: z.ZodOptional<
      z.ZodNullable<
        z.ZodEnum<{
          source: 'source';
          target: 'target';
        }>
      >
    >;
    formMode: z.ZodOptional<
      z.ZodEnum<{
        select: 'select';
        manage: 'manage';
      }>
    >;
    max: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
  },
  z.core.$strip
> {
  return z.object({
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
    labelParts: z.array(relationshipLabelPart()).optional(),
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
}

function dropdown(): z.ZodObject<
  {
    id: z.ZodString;
    label: z.ZodString;
    color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sortField: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sortDirection: z.ZodOptional<
      z.ZodNullable<
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
    id: z.string().trim(),
    label: z.string().trim(),
    color: z.string().nullable().optional(),
    sortField: z.string().nullable().optional(),
    sortDirection: z.enum(E_SORT_DIRECTION).nullable().optional(),
  });
}

// Regra de validacao configurada no campo: { rule, config }. `config` carrega os
// parametros da regra (range → { min, max }; is-not → { values }); vazio para
// regras sem parametro.
function validation(): z.ZodObject<
  {
    rule: z.ZodEnum<{
      readonly NOT_EMPTY: 'NOT_EMPTY';
      readonly IS_EMAIL: 'IS_EMAIL';
      readonly IS_NUMERIC: 'IS_NUMERIC';
      readonly IS_ALPHA_NUMERIC: 'IS_ALPHA_NUMERIC';
      readonly IS_IN_RANGE: 'IS_IN_RANGE';
      readonly IS_IBAN: 'IS_IBAN';
      readonly IS_NOT: 'IS_NOT';
      readonly IS_URL: 'IS_URL';
      readonly IS_PHONE: 'IS_PHONE';
      readonly IS_CPF: 'IS_CPF';
      readonly IS_CNPJ: 'IS_CNPJ';
      readonly IS_UNIQUE: 'IS_UNIQUE';
      readonly ARE_UNIQUE_VALUES: 'ARE_UNIQUE_VALUES';
      readonly EMAIL_EXISTS: 'EMAIL_EXISTS';
      readonly USER_EXISTS: 'USER_EXISTS';
    }>;
    config: z.ZodPipe<
      z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>,
      z.ZodTransform<
        Record<string, unknown>,
        Record<string, unknown> | null | undefined
      >
    >;
  },
  z.core.$strip
> {
  return z.object({
    rule: z.enum(E_FIELD_VALIDATION),
    config: z
      .record(z.string(), z.unknown())
      .nullish()
      .transform((value) => value ?? {}),
  });
}
// Aceita null/undefined (clientes que reenviam o campo cru do GET) → [].
function fieldValidations(): z.ZodPipe<
  z.ZodOptional<
    z.ZodNullable<
      z.ZodArray<
        z.ZodObject<
          {
            rule: z.ZodEnum<{
              readonly NOT_EMPTY: 'NOT_EMPTY';
              readonly IS_EMAIL: 'IS_EMAIL';
              readonly IS_NUMERIC: 'IS_NUMERIC';
              readonly IS_ALPHA_NUMERIC: 'IS_ALPHA_NUMERIC';
              readonly IS_IN_RANGE: 'IS_IN_RANGE';
              readonly IS_IBAN: 'IS_IBAN';
              readonly IS_NOT: 'IS_NOT';
              readonly IS_URL: 'IS_URL';
              readonly IS_PHONE: 'IS_PHONE';
              readonly IS_CPF: 'IS_CPF';
              readonly IS_CNPJ: 'IS_CNPJ';
              readonly IS_UNIQUE: 'IS_UNIQUE';
              readonly ARE_UNIQUE_VALUES: 'ARE_UNIQUE_VALUES';
              readonly EMAIL_EXISTS: 'EMAIL_EXISTS';
              readonly USER_EXISTS: 'USER_EXISTS';
            }>;
            config: z.ZodPipe<
              z.ZodOptional<
                z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>
              >,
              z.ZodTransform<
                Record<string, unknown>,
                Record<string, unknown> | null | undefined
              >
            >;
          },
          z.core.$strip
        >
      >
    >
  >,
  z.ZodTransform<
    {
      rule:
        | 'NOT_EMPTY'
        | 'IS_EMAIL'
        | 'IS_NUMERIC'
        | 'IS_ALPHA_NUMERIC'
        | 'IS_IN_RANGE'
        | 'IS_IBAN'
        | 'IS_NOT'
        | 'IS_URL'
        | 'IS_PHONE'
        | 'IS_CPF'
        | 'IS_CNPJ'
        | 'IS_UNIQUE'
        | 'ARE_UNIQUE_VALUES'
        | 'EMAIL_EXISTS'
        | 'USER_EXISTS';
      config: Record<string, unknown>;
    }[],
    | {
        rule:
          | 'NOT_EMPTY'
          | 'IS_EMAIL'
          | 'IS_NUMERIC'
          | 'IS_ALPHA_NUMERIC'
          | 'IS_IN_RANGE'
          | 'IS_IBAN'
          | 'IS_NOT'
          | 'IS_URL'
          | 'IS_PHONE'
          | 'IS_CPF'
          | 'IS_CNPJ'
          | 'IS_UNIQUE'
          | 'ARE_UNIQUE_VALUES'
          | 'EMAIL_EXISTS'
          | 'USER_EXISTS';
        config: Record<string, unknown>;
      }[]
    | null
    | undefined
  >
> {
  return z
    .array(validation())
    .nullish()
    .transform((value) => value ?? []);
}

export const FieldValidationsSchema = fieldValidations();

// Propriedades flat do campo (não aninhadas em configuration)
function fieldRequired(): z.ZodDefault<z.ZodBoolean> {
  return z.boolean().default(false);
}

export const FieldRequiredSchema = fieldRequired();
function fieldMultiple(): z.ZodDefault<z.ZodBoolean> {
  return z.boolean().default(false);
}

export const FieldMultipleSchema = fieldMultiple();
function fieldFormat(): z.ZodDefault<
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
  return z.enum(E_FIELD_FORMAT).nullable().default(null);
}

export const FieldFormatSchema = fieldFormat();
// Exibe o campo na barra de filtros (config de UX, nao e permissao).
function fieldShowInFilter(): z.ZodDefault<z.ZodBoolean> {
  return z.boolean().default(false);
}

export const FieldShowInFilterSchema = fieldShowInFilter();
// Campos-filho de FIELD_GROUP: elegibilidade + visibilidade na listagem geral
// da tabela pai (nao e permissao; ver IField em entity.core.ts). Opcionais:
// Mongoose aplica default false e o schema Fastify coage no body HTTP.
function fieldShowInParentList(): z.ZodOptional<z.ZodBoolean> {
  return z.boolean().optional();
}

export const FieldShowInParentListSchema = fieldShowInParentList();
function fieldVisibleInParentList(): z.ZodOptional<z.ZodBoolean> {
  return z.boolean().optional();
}

export const FieldVisibleInParentListSchema = fieldVisibleInParentList();
function fieldWidthInForm(): z.ZodDefault<z.ZodNullable<z.ZodNumber>> {
  return z.number().min(0).nullable().default(50);
}

export const FieldWidthInFormSchema = fieldWidthInForm();
function fieldWidthInList(): z.ZodDefault<z.ZodNullable<z.ZodNumber>> {
  return z.number().min(0).nullable().default(10);
}

export const FieldWidthInListSchema = fieldWidthInList();
function fieldWidthInDetail(): z.ZodDefault<z.ZodNullable<z.ZodNumber>> {
  return z.number().min(0).nullable().default(50);
}

export const FieldWidthInDetailSchema = fieldWidthInDetail();
// Limite de chips exibidos antes de resumir o restante em "+N" — aplicavel aos
// campos DROPDOWN, RELATIONSHIP e USER quando multiple. null = sem limite,
// exibe todos os selecionados.
function fieldVisibleChipsLimit(): z.ZodDefault<z.ZodNullable<z.ZodNumber>> {
  return z.number().int().positive().nullable().default(null);
}

export const FieldVisibleChipsLimitSchema = fieldVisibleChipsLimit();
function fieldTip(): z.ZodPipe<
  z.ZodDefault<z.ZodNullable<z.ZodString>>,
  z.ZodTransform<string | null, string | null>
> {
  return z
    .string()
    .trim()
    .max(500)
    .nullable()
    .default(null)
    .transform((value) => {
      if (value && value.length > 0) return value;
      return null;
    });
}

export const FieldTipSchema = fieldTip();
function fieldHtmlContent(): z.ZodDefault<z.ZodNullable<z.ZodString>> {
  return z.string().trim().nullable().default(null);
}

export const FieldHtmlContentSchema = fieldHtmlContent();
function fieldLocked(): z.ZodDefault<z.ZodBoolean> {
  return z.boolean().default(false);
}

export const FieldLockedSchema = fieldLocked();
// Rotulo customizado por contexto. SEM default no objeto: ausente permanece
// `undefined` para que callers que omitem `label` (ex.: toggle de visibilidade)
// nunca apaguem os rotulos existentes. Contexto vazio → null (usa o name).
function fieldLabelContext(): z.ZodPipe<
  z.ZodOptional<z.ZodNullable<z.ZodString>>,
  z.ZodTransform<string | null, string | null | undefined>
> {
  return z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .transform((v) => {
      if (v && v.length > 0) return v;
      return null;
    });
}

function fieldLabel(): z.ZodOptional<
  z.ZodNullable<
    z.ZodObject<
      {
        list: z.ZodPipe<
          z.ZodOptional<z.ZodNullable<z.ZodString>>,
          z.ZodTransform<string | null, string | null | undefined>
        >;
        filter: z.ZodPipe<
          z.ZodOptional<z.ZodNullable<z.ZodString>>,
          z.ZodTransform<string | null, string | null | undefined>
        >;
        form: z.ZodPipe<
          z.ZodOptional<z.ZodNullable<z.ZodString>>,
          z.ZodTransform<string | null, string | null | undefined>
        >;
        detail: z.ZodPipe<
          z.ZodOptional<z.ZodNullable<z.ZodString>>,
          z.ZodTransform<string | null, string | null | undefined>
        >;
      },
      z.core.$strip
    >
  >
> {
  return z
    .object({
      list: fieldLabelContext(),
      filter: fieldLabelContext(),
      form: fieldLabelContext(),
      detail: fieldLabelContext(),
    })
    .nullable()
    .optional();
}

export const FieldLabelSchema = fieldLabel();
function fieldDefaultValue(): z.ZodDefault<
  z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>
> {
  return z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .default(null);
}

export const FieldDefaultValueSchema = fieldDefaultValue();
function fieldRelationship(): z.ZodDefault<
  z.ZodNullable<
    z.ZodObject<
      {
        table: z.ZodObject<
          {
            _id: z.ZodString;
            slug: z.ZodString;
          },
          z.core.$strip
        >;
        field: z.ZodObject<
          {
            _id: z.ZodString;
            slug: z.ZodString;
          },
          z.core.$strip
        >;
        order: z.ZodDefault<
          z.ZodEnum<{
            readonly ASC: 'asc';
            readonly DESC: 'desc';
          }>
        >;
        customLabel: z.ZodOptional<z.ZodBoolean>;
        labelParts: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                path: z.ZodString;
                label: z.ZodOptional<z.ZodString>;
              },
              z.core.$strip
            >
          >
        >;
        labelSeparator: z.ZodOptional<z.ZodString>;
        visible: z.ZodOptional<z.ZodBoolean>;
        onDelete: z.ZodOptional<
          z.ZodEnum<{
            readonly CASCADE: 'CASCADE';
            readonly SET_NULL: 'SET_NULL';
            readonly RESTRICT: 'RESTRICT';
          }>
        >;
        mirror: z.ZodOptional<
          z.ZodObject<
            {
              multiple: z.ZodDefault<z.ZodBoolean>;
              visible: z.ZodDefault<z.ZodBoolean>;
              label: z.ZodOptional<z.ZodString>;
            },
            z.core.$strip
          >
        >;
        relationshipId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        side: z.ZodOptional<
          z.ZodNullable<
            z.ZodEnum<{
              source: 'source';
              target: 'target';
            }>
          >
        >;
        formMode: z.ZodOptional<
          z.ZodEnum<{
            select: 'select';
            manage: 'manage';
          }>
        >;
        max: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
      },
      z.core.$strip
    >
  >
> {
  return relationship().nullable().default(null);
}

export const FieldRelationshipSchema = fieldRelationship();
// Aceita null além de undefined: alguns clientes (ex.: Kanban) reenviam o campo
// cru do GET, onde dropdown/category vêm como null, e normaliza para [].
function fieldDropdown(): z.ZodPipe<
  z.ZodOptional<
    z.ZodNullable<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            label: z.ZodString;
            color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            sortField: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            sortDirection: z.ZodOptional<
              z.ZodNullable<
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
  >,
  z.ZodTransform<
    {
      id: string;
      label: string;
      color?: string | null | undefined;
      sortField?: string | null | undefined;
      sortDirection?: 'asc' | 'desc' | null | undefined;
    }[],
    | {
        id: string;
        label: string;
        color?: string | null | undefined;
        sortField?: string | null | undefined;
        sortDirection?: 'asc' | 'desc' | null | undefined;
      }[]
    | null
    | undefined
  >
> {
  return z
    .array(dropdown())
    .nullish()
    .transform((value) => value ?? []);
}

export const FieldDropdownSchema = fieldDropdown();
function fieldAllowCustomDropdownOptions(): z.ZodDefault<z.ZodBoolean> {
  return z.boolean().default(false);
}

export const FieldAllowCustomDropdownOptionsSchema =
  fieldAllowCustomDropdownOptions();
function fieldAllowCreateRelationshipRecords(): z.ZodDefault<z.ZodBoolean> {
  return z.boolean().default(false);
}

export const FieldAllowCreateRelationshipRecordsSchema =
  fieldAllowCreateRelationshipRecords();
function fieldFillWithCurrentUserWhenEmpty(): z.ZodDefault<z.ZodBoolean> {
  return z.boolean().default(false);
}

export const FieldFillWithCurrentUserWhenEmptySchema =
  fieldFillWithCurrentUserWhenEmpty();
function fieldCategory(): z.ZodPipe<
  z.ZodOptional<
    z.ZodNullable<
      z.ZodArray<
        z.ZodType<
          ICategory,
          unknown,
          z.core.$ZodTypeInternals<ICategory, unknown>
        >
      >
    >
  >,
  z.ZodTransform<ICategory[], ICategory[] | null | undefined>
> {
  return z
    .array(Category)
    .nullish()
    .transform((value) => value ?? []);
}

export const FieldCategorySchema = fieldCategory();
// For API input: can be just a slug string or the full object
function fieldGroup(): z.ZodDefault<
  z.ZodNullable<
    z.ZodUnion<
      readonly [
        z.ZodString,
        z.ZodObject<
          {
            _id: z.ZodOptional<
              z.ZodPipe<
                z.ZodOptional<z.ZodNullable<z.ZodString>>,
                z.ZodTransform<string | undefined, string | null | undefined>
              >
            >;
            slug: z.ZodString;
          },
          z.core.$strip
        >,
      ]
    >
  >
> {
  return z
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
}

export const FieldGroupSchema = fieldGroup();

// Schema para body de criação/atualização de campos
export const TableFieldBaseSchema = z.object({
  required: fieldRequired(),
  multiple: fieldMultiple(),
  format: fieldFormat(),
  validations: fieldValidations(),
  showInFilter: fieldShowInFilter(),
  showInParentList: fieldShowInParentList(),
  visibleInParentList: fieldVisibleInParentList(),
  permissions: fieldPermissions(),
  widthInForm: fieldWidthInForm(),
  widthInList: fieldWidthInList(),
  widthInDetail: fieldWidthInDetail(),
  visibleChipsLimit: fieldVisibleChipsLimit(),
  tip: fieldTip(),
  htmlContent: fieldHtmlContent(),
  locked: fieldLocked(),
  label: fieldLabel(),
  defaultValue: fieldDefaultValue(),
  relationship: fieldRelationship(),
  dropdown: fieldDropdown(),
  allowCustomDropdownOptions: fieldAllowCustomDropdownOptions(),
  allowCreateRelationshipRecords: fieldAllowCreateRelationshipRecords(),
  fillWithCurrentUserWhenEmpty: fieldFillWithCurrentUserWhenEmpty(),
  category: fieldCategory(),
  group: fieldGroup(),
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
