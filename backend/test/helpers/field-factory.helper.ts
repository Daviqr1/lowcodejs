import crypto from 'node:crypto';

import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  type ICategory,
  type IDropdown,
  type IField,
  type IFieldConfigurationRelationship,
  type ValueOf,
} from '@application/core/entity.core';

const FIELD_BASE: Omit<IField, '_id'> = {
  name: 'Campo',
  slug: 'campo',
  type: E_FIELD_TYPE.TEXT_SHORT,
  required: false,
  multiple: false,
  format: null,
  validations: [],
  showInFilter: false,
  permissions: buildFieldPermissions(true, true, true),
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: 50,
  defaultValue: null,
  locked: false,
  native: false,
  relationship: null,
  dropdown: [],
  category: [],
  group: null,
  createdAt: new Date(),
  updatedAt: null,
  trashedAt: null,
  trashed: false,
};

type FieldOverrides = Partial<IField>;

function buildField(overrides: FieldOverrides): IField {
  return {
    ...FIELD_BASE,
    _id: crypto.randomUUID(),
    ...overrides,
  };
}

export function makeTextShortField(overrides?: FieldOverrides): IField {
  return buildField({
    name: 'Texto Curto',
    slug: 'texto-curto',
    type: E_FIELD_TYPE.TEXT_SHORT,
    format: E_FIELD_FORMAT.ALPHA_NUMERIC,
    ...overrides,
  });
}

export function makeTextShortWithFormat(
  format: ValueOf<typeof E_FIELD_FORMAT>,
  overrides?: FieldOverrides,
): IField {
  const slug = `campo-${format.toLowerCase().replace(/_/g, '-')}`;
  return buildField({
    name: `Campo ${format}`,
    slug,
    type: E_FIELD_TYPE.TEXT_SHORT,
    format,
    ...overrides,
  });
}

export function makePasswordField(overrides?: FieldOverrides): IField {
  return buildField({
    name: 'Senha',
    slug: 'senha',
    type: E_FIELD_TYPE.TEXT_SHORT,
    format: E_FIELD_FORMAT.PASSWORD,
    ...overrides,
  });
}

export function makeTextLongField(overrides?: FieldOverrides): IField {
  return buildField({
    name: 'Texto Longo',
    slug: 'texto-longo',
    type: E_FIELD_TYPE.TEXT_LONG,
    format: E_FIELD_FORMAT.RICH_TEXT,
    ...overrides,
  });
}

export function makeDateField(overrides?: FieldOverrides): IField {
  return buildField({
    name: 'Data',
    slug: 'data',
    type: E_FIELD_TYPE.DATE,
    format: E_FIELD_FORMAT.DD_MM_YYYY,
    ...overrides,
  });
}

export function makeDropdownField(
  options: IDropdown[],
  overrides?: FieldOverrides,
): IField {
  return buildField({
    name: 'Opcao',
    slug: 'opcao',
    type: E_FIELD_TYPE.DROPDOWN,
    dropdown: options,
    ...overrides,
  });
}

export function makeRelationshipField(
  config: IFieldConfigurationRelationship,
  overrides?: FieldOverrides,
): IField {
  return buildField({
    name: 'Relacionamento',
    slug: 'relacionamento',
    type: E_FIELD_TYPE.RELATIONSHIP,
    relationship: config,
    ...overrides,
  });
}

export function makeFileField(overrides?: FieldOverrides): IField {
  return buildField({
    name: 'Arquivo',
    slug: 'arquivo',
    type: E_FIELD_TYPE.FILE,
    ...overrides,
  });
}

export function makeFieldGroupField(
  groupSlug: string,
  overrides?: FieldOverrides,
): IField {
  return buildField({
    name: 'Grupo',
    slug: groupSlug,
    type: E_FIELD_TYPE.FIELD_GROUP,
    group: { slug: groupSlug },
    ...overrides,
  });
}

export function makeCategoryField(
  categories: ICategory[],
  overrides?: FieldOverrides,
): IField {
  return buildField({
    name: 'Categoria',
    slug: 'categoria',
    type: E_FIELD_TYPE.CATEGORY,
    category: categories,
    ...overrides,
  });
}

export function makeUserField(overrides?: FieldOverrides): IField {
  return buildField({
    name: 'Usuario',
    slug: 'usuario',
    type: E_FIELD_TYPE.USER,
    ...overrides,
  });
}

export function makeReactionField(overrides?: FieldOverrides): IField {
  return buildField({
    name: 'Reacao',
    slug: 'reacao',
    type: E_FIELD_TYPE.REACTION,
    ...overrides,
  });
}

export function makeEvaluationField(overrides?: FieldOverrides): IField {
  return buildField({
    name: 'Avaliacao',
    slug: 'avaliacao',
    type: E_FIELD_TYPE.EVALUATION,
    ...overrides,
  });
}
