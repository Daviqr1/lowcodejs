/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { CSSProperties } from 'react';

import { E_FIELD_FORMAT, E_FIELD_TYPE, E_FIELD_VALIDATION } from './constant';
import type {
  ICategory,
  IDropdown,
  IField,
  IGroup,
  IRow,
  IStorage,
  IUser,
  Merge,
  SearchableOption,
} from './interfaces';
import { resolveRelationshipLabel } from './relationship-label';

// N:N (muitos-para-muitos): os dois lados múltiplos. Só N:N usa o pivô/links.

type FieldLabelContext = 'list' | 'filter' | 'form' | 'detail';

// Rótulo de exibição do campo por contexto. `label` customizado tem prioridade
// sobre `name` (que continua sendo o nome original que controla o slug). Nunca
// toca o slug. Contexto default: 'list'.
export function resolveFieldLabel(
  field: Pick<IField, 'name' | 'label'>,
  context: FieldLabelContext = 'list',
): string {
  const label = field.label?.[context]?.trim();
  if (label) return label;
  return field.name;
}

export function isManyToManyRelationship(field: IField): boolean {
  if (field.type !== E_FIELD_TYPE.RELATIONSHIP) return false;
  if (!field.multiple) return false;
  return Boolean(field.relationship?.mirror?.multiple);
}

// Relationship gerido pelo repetidor (endpoints /links): só quando formMode é
// 'manage' E a cardinalidade é N:N. Em 1:1/1:N o backend rejeita os /links
// (N:N-only), então caem no modo 'select' (FK escrita no payload da row).
export function isManagedRelationship(field: IField): boolean {
  if (field.relationship?.formMode !== 'manage') return false;
  return isManyToManyRelationship(field);
}

export function getDropdownItem(
  items: Array<IDropdown>,
  id: string,
): IDropdown | undefined {
  return items.find((item) => item.id === id);
}

export function getCategoryItem(
  categories: Array<ICategory>,
  id: string,
): ICategory | undefined {
  for (const category of categories) {
    if (category.id === id) {
      return category;
    }
    if (category.children.length > 0) {
      const found = getCategoryItem(category.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

// Build default values for creating new rows

type FileFieldValue = {
  storages: Array<IStorage>;
  files: Array<File>;
};

type RowFieldValue =
  | string
  | Array<string>
  | FileFieldValue
  | Array<{ value: string; label: string }>;

export type CreateRowDefaultValue = Record<
  string,
  RowFieldValue | Array<Record<string, RowFieldValue>>
>;
function toDefaultArray(value: string | Array<string> | null): Array<string> {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) return [value];
  return [];
}

function toDefaultSearchableOptions(
  value: string | Array<string> | null,
): Array<{ value: string; label: string }> {
  const ids = toDefaultArray(value);
  return ids.map((id) => ({ value: id, label: '' }));
}

export function buildCreateRowDefaultValues(
  fields: Array<IField>,
  overrides?: CreateRowDefaultValue,
): CreateRowDefaultValue {
  const defaults: Record<
    string,
    RowFieldValue | Array<Record<string, RowFieldValue>>
  > = {};

  for (const field of fields) {
    if (field.trashed) continue;
    // Skip system-managed fields
    if (
      field.type === E_FIELD_TYPE.REACTION ||
      field.type === E_FIELD_TYPE.EVALUATION ||
      field.type === E_FIELD_TYPE.FIELD_GROUP ||
      field.type === E_FIELD_TYPE.HTML_CONTENT
    ) {
      continue;
    }
    if (field.native) continue;

    switch (field.type) {
      case E_FIELD_TYPE.TEXT_SHORT:
      case E_FIELD_TYPE.TEXT_LONG:
        defaults[field.slug] = field.defaultValue ?? '';
        break;
      case E_FIELD_TYPE.DATE:
        if (typeof field.defaultValue === 'string' && field.defaultValue) {
          defaults[field.slug] = field.defaultValue;
        } else {
          defaults[field.slug] = '';
        }
        break;
      case E_FIELD_TYPE.DROPDOWN:
      case E_FIELD_TYPE.CATEGORY:
      case E_FIELD_TYPE.USER_GROUP: {
        const arr = toDefaultArray(field.defaultValue);
        if (arr.length > 0) defaults[field.slug] = arr;
        if (arr.length === 0) defaults[field.slug] = [];
        break;
      }
      case E_FIELD_TYPE.FILE:
        defaults[field.slug] = { storages: [], files: [] };
        break;
      case E_FIELD_TYPE.RELATIONSHIP:
      case E_FIELD_TYPE.USER: {
        const opts = toDefaultSearchableOptions(field.defaultValue);
        if (opts.length > 0) defaults[field.slug] = opts;
        if (opts.length === 0) defaults[field.slug] = [];
        break;
      }
      // @ts-ignore
      case E_FIELD_TYPE.EVALUATION:
        defaults[field.slug] = [];
        break;
      default:
        defaults[field.slug] = '';
    }
  }

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (key in defaults) defaults[key] = value;
    }
  }

  return defaults;
}

// Build default values from existing row data (for editing)

export type UpdateRowDefaultValue =
  | RowFieldValue
  | Array<Record<string, RowFieldValue>>;

// Valor de UM campo individual (inclui FIELD_GROUP)
export type FieldValue =
  | RowFieldValue
  | Array<Record<string, RowFieldValue>>
  | null;

function toArray<T>(value: unknown): Array<T> {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  // Coerção genérica: valor dinâmico de campo sem forma conhecida em runtime.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return [value as T];
}

// Coerção genérica de valor dinâmico (FieldValue) para iterável tipado — a
// forma real (Array<string> / Array<SearchableOption>) só é conhecida em runtime.
function fromIterable<T>(value: unknown): Array<T> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return Array.from(value as Iterable<T>);
}

export function buildUpdateRowDefaultValues(
  data: IRow,
  fields: Array<IField>,
): Record<string, UpdateRowDefaultValue> {
  const defaults: Record<string, UpdateRowDefaultValue> = {};

  for (const field of fields) {
    if (field.trashed) continue;
    // Skip system-managed fields
    if (
      field.type === E_FIELD_TYPE.REACTION ||
      field.type === E_FIELD_TYPE.EVALUATION ||
      field.type === E_FIELD_TYPE.FIELD_GROUP ||
      field.type === E_FIELD_TYPE.HTML_CONTENT
    ) {
      continue;
    }
    if (field.native) continue;

    const value = data[field.slug];

    switch (field.type) {
      case E_FIELD_TYPE.TEXT_SHORT:
        if (typeof value === 'string' && value) {
          defaults[field.slug] = value;
        } else if (typeof field.defaultValue === 'string') {
          defaults[field.slug] = field.defaultValue;
        } else {
          defaults[field.slug] = '';
        }
        break;
      case E_FIELD_TYPE.TEXT_LONG:
        if (typeof value === 'string' && value) {
          defaults[field.slug] = value;
        } else if (typeof field.defaultValue === 'string') {
          defaults[field.slug] = field.defaultValue;
        } else {
          defaults[field.slug] = '';
        }
        break;
      case E_FIELD_TYPE.DROPDOWN: {
        const options = toArray<string>(value);
        defaults[field.slug] = options;
        break;
      }
      case E_FIELD_TYPE.DATE: {
        let dateValue = '';
        if (typeof value === 'string') dateValue = value;
        defaults[field.slug] = dateValue;
        break;
      }
      case E_FIELD_TYPE.FILE: {
        const storages = toArray<IStorage>(value);

        defaults[field.slug] = {
          files: [],
          storages,
        };
        break;
      }
      case E_FIELD_TYPE.RELATIONSHIP: {
        const rows = toArray<IRow>(value);
        const relConfig = field.relationship;

        defaults[field.slug] = rows.map((row) => ({
          value: row._id,
          label: resolveRelationshipLabel(row, relConfig),
        }));
        break;
      }
      case E_FIELD_TYPE.CATEGORY: {
        const options = toArray<string>(value);
        defaults[field.slug] = options;
        break;
      }
      case E_FIELD_TYPE.USER: {
        const users = toArray<IUser>(value);
        defaults[field.slug] = users.map((user) => {
          if (typeof user === 'object' && user !== null) {
            return { value: user._id, label: user.name };
          }
          return { value: String(user), label: String(user) };
        });
        break;
      }
      case E_FIELD_TYPE.USER_GROUP: {
        const groups = toArray<IGroup>(value);
        defaults[field.slug] = groups.map((group) => {
          if (typeof group === 'object' && group !== null) return group._id;
          return String(group);
        });
        break;
      }
      default: {
        let fallback: UpdateRowDefaultValue = '';
        if (typeof value === 'string') fallback = value;
        defaults[field.slug] = fallback;
      }
    }
  }

  return defaults;
}

type RowBasePayload = string | null | Array<string>;

type RowPayload =
  | string
  | null
  | Array<string>
  | Array<Record<string, RowBasePayload>>;

// Build payload for row create/update API
export function buildRowPayload(
  values: Record<string, FieldValue>,
  fields: Array<IField>,
): Record<string, RowPayload> {
  const payload: Record<string, RowPayload> = {};

  for (const field of fields) {
    if (field.trashed) continue;
    // Skip system-managed fields
    if (
      field.type === E_FIELD_TYPE.REACTION ||
      field.type === E_FIELD_TYPE.EVALUATION ||
      field.type === E_FIELD_TYPE.FIELD_GROUP ||
      field.type === E_FIELD_TYPE.HTML_CONTENT
    ) {
      continue;
    }
    if (field.native) continue;
    const value = values[field.slug];
    payload[field.slug] = mountRowValue(value, field);
  }

  return payload;
}

export function mountRowValue(value: FieldValue, field: IField): RowPayload {
  const isMultiple = field.multiple;

  switch (field.type) {
    case E_FIELD_TYPE.EVALUATION:
    case E_FIELD_TYPE.REACTION:
      return null; // System-managed, should not be in payloads
    case E_FIELD_TYPE.TEXT_SHORT:
    case E_FIELD_TYPE.TEXT_LONG:
      if (
        value === '' &&
        typeof field.defaultValue === 'string' &&
        field.defaultValue !== null
      )
        return field.defaultValue;

      if (value !== '' && value !== null) {
        return value.toString();
      }

      if (value === '' || field.defaultValue === null) {
        return null;
      }

      return null;
    case E_FIELD_TYPE.DROPDOWN: {
      if (value === null) {
        return [];
      }

      // FieldValue é união ampla; em runtime este caso é sempre Array<string>.
      const options = fromIterable<string>(value);

      const hasItem = options.length > 0;

      if (!isMultiple && hasItem) {
        const [option] = options;
        return [option];
      }

      if (isMultiple && hasItem) return options;

      return [];
    }
    case E_FIELD_TYPE.DATE: {
      if (typeof value === 'string' && value !== '') {
        return value;
      }

      return null;
    }
    case E_FIELD_TYPE.FILE: {
      if (value === null) return [];

      let storages: Array<IStorage> = [];
      if (
        typeof value === 'object' &&
        value !== null &&
        'storages' in value &&
        Array.isArray(value.storages)
      ) {
        storages = value.storages;
      }

      const hasItem = storages.length > 0;

      if (!isMultiple && hasItem) {
        const [storage] = storages;
        return [storage._id];
      }

      if (isMultiple && hasItem) {
        return storages.flatMap((s) => s._id);
      }

      return [];
    }
    case E_FIELD_TYPE.RELATIONSHIP: {
      if (value === null) return [];

      // FieldValue é união ampla; em runtime este caso é Array<SearchableOption>.
      const options = fromIterable<SearchableOption>(value);
      const hasItem = options.length > 0;

      if (!isMultiple && hasItem) {
        const [option] = options;
        return [option.value];
      }

      if (isMultiple && hasItem) {
        return options.flatMap((option) => option.value);
      }

      return [];
    }
    case E_FIELD_TYPE.CATEGORY:
    case E_FIELD_TYPE.USER_GROUP: {
      if (value === null) return [];

      // FieldValue é união ampla; em runtime este caso é sempre Array<string>.
      const options = fromIterable<string>(value);

      const hasItem = options.length > 0;

      if (!isMultiple && hasItem) {
        const [option] = options;
        return [option];
      }

      if (isMultiple && hasItem) {
        return options;
      }

      return [];
    }
    case E_FIELD_TYPE.USER: {
      if (value === null) return [];

      // FieldValue é união ampla; em runtime este caso é Array<SearchableOption>.
      const options = fromIterable<SearchableOption>(value);
      const hasItem = options.length > 0;

      if (!isMultiple && hasItem) {
        const [option] = options;
        return [option.value];
      }

      if (isMultiple && hasItem) {
        return options.flatMap((option) => option.value);
      }

      return [];
    }
    default:
      if (value === null) return null;
      if (typeof value === 'string') return value;
      return String(value);
  }
}

// Regexes das regras puras de validação (espelham o backend field-rules.core).
const PURE_RULE_REGEX: Record<string, { regex: RegExp; message: string }> = {
  [E_FIELD_VALIDATION.IS_EMAIL]: {
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Formato de e-mail inválido',
  },
  [E_FIELD_VALIDATION.IS_URL]: {
    regex: /^https?:\/\/.+/,
    message: 'Formato de URL inválido',
  },
  [E_FIELD_VALIDATION.IS_NUMERIC]: {
    regex: /^-?\d+(\.\d+)?$/,
    message: 'Deve ser um número',
  },
  [E_FIELD_VALIDATION.IS_ALPHA_NUMERIC]: {
    regex: /^[a-zA-Z0-9]+$/,
    message: 'Deve conter apenas letras e números',
  },
  [E_FIELD_VALIDATION.IS_PHONE]: {
    regex: /^\(\d{2}\)\s?\d{4,5}-\d{4}$/,
    message: 'Formato de telefone inválido',
  },
  [E_FIELD_VALIDATION.IS_CPF]: {
    regex: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
    message: 'Formato de CPF inválido',
  },
  [E_FIELD_VALIDATION.IS_CNPJ]: {
    regex: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
    message: 'Formato de CNPJ inválido',
  },
};

function coerceNumber(input: unknown): number | null {
  if (typeof input === 'number' && !Number.isNaN(input)) return input;
  if (typeof input === 'string' && input.trim() !== '') {
    const parsed = Number(input);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;
  if (iban.length < 15 || iban.length > 34) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let expanded = '';
  for (const char of rearranged) {
    if (char >= '0' && char <= '9') {
      expanded += char;
      continue;
    }
    expanded += String(char.charCodeAt(0) - 55);
  }
  let remainder = 0;
  for (const digit of expanded) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

// Roda as regras de validação PURAS configuradas no campo (camada única). As
// regras de banco (is-unique, email-exists, etc.) ficam a cargo do backend no
// submit — aqui são ignoradas. Retorna a 1ª mensagem de erro ou undefined.
function validatePureRules(
  field: IField,
  value: FieldValue | undefined,
): string | undefined {
  const validations = field.validations;
  if (!validations || validations.length === 0) return undefined;

  const empty = value === null || value === undefined || value === '';

  for (const { rule, config } of validations) {
    if (rule === E_FIELD_VALIDATION.NOT_EMPTY) {
      const blankString = typeof value === 'string' && value.trim() === '';
      if (empty || blankString)
        return resolveFieldLabel(field, 'form') + ' não pode ser vazio';
      continue;
    }

    if (empty) continue;
    if (typeof value !== 'string') continue;

    const regexRule = PURE_RULE_REGEX[rule];
    if (regexRule) {
      if (!regexRule.regex.test(value)) return regexRule.message;
      continue;
    }

    if (rule === E_FIELD_VALIDATION.IS_IN_RANGE) {
      const num = coerceNumber(value);
      if (num === null) return 'Deve ser um número';
      const min = coerceNumber(config.min);
      const max = coerceNumber(config.max);
      if (min !== null && num < min) return 'Deve ser maior ou igual a ' + min;
      if (max !== null && num > max) return 'Deve ser menor ou igual a ' + max;
      continue;
    }

    if (rule === E_FIELD_VALIDATION.IS_NOT) {
      const list: Array<unknown> = [];
      if (Array.isArray(config.values)) list.push(...config.values);
      if (list.map((item) => String(item)).includes(value))
        return 'Valor não permitido';
      continue;
    }

    if (rule === E_FIELD_VALIDATION.IS_IBAN) {
      if (!isValidIban(value)) return 'IBAN inválido';
      continue;
    }
  }

  return undefined;
}

export function buildFieldValidator(
  field: IField,
  value: FieldValue | undefined,
): string | undefined {
  const isRequired = field.required;
  const isMultiple = field.multiple;

  const arrayInvalidValue = Array.isArray(value) && value.length === 0;

  let storageInvalidValue = false;
  if (
    field.type === E_FIELD_TYPE.FILE &&
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'storages' in value
  ) {
    storageInvalidValue = value.storages.length === 0;
  }

  const invalidValue: boolean =
    value === null ||
    value === undefined ||
    value === '' ||
    arrayInvalidValue ||
    storageInvalidValue;

  if (isRequired) {
    if (!isMultiple && invalidValue) {
      return resolveFieldLabel(field, 'form') + ' é obrigatório';
    }

    if (isMultiple && invalidValue) {
      return 'Adicione ao menos um item a ' + resolveFieldLabel(field, 'form');
    }
  }

  // Validação de formato para TEXT_SHORT
  if (
    typeof value === 'string' &&
    value !== '' &&
    field.format &&
    field.type === E_FIELD_TYPE.TEXT_SHORT
  ) {
    const formatValidators: Record<string, { regex: RegExp; message: string }> =
      {
        [E_FIELD_FORMAT.EMAIL]: {
          regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: 'E-mail inválido',
        },
        [E_FIELD_FORMAT.URL]: {
          regex: /^https?:\/\/.+/,
          message: 'URL inválida. Use http:// ou https://',
        },
        [E_FIELD_FORMAT.INTEGER]: {
          regex: /^-?\d+$/,
          message: 'Deve ser um número inteiro',
        },
        [E_FIELD_FORMAT.DECIMAL]: {
          regex: /^-?\d+([.,]\d+)?$/,
          message: 'Deve ser um número decimal',
        },
        [E_FIELD_FORMAT.PHONE]: {
          regex: /^\(\d{2}\)\s?\d{4,5}-\d{4}$/,
          message: 'Telefone inválido',
        },
        [E_FIELD_FORMAT.CPF]: {
          regex: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
          message: 'CPF inválido',
        },
        [E_FIELD_FORMAT.CNPJ]: {
          regex: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
          message: 'CNPJ inválido',
        },
      };
    const validator = formatValidators[field.format];
    if (validator && !validator.regex.test(value)) {
      return validator.message;
    }
  }

  const ruleError = validatePureRules(field, value);
  if (ruleError) return ruleError;

  return undefined;
}

// Props responsivas do wrapper de um campo de formulário: full-width no mobile,
// largura % configurada (widthInForm) só a partir de sm. A largura vira CSS var
// porque o `style` inline venceria o `w-full` no mobile. O tipo Merge libera a
// custom property sem `as`. Reaproveitado por todos os editores de campo (row,
// relationship inline, group inline/dialog).
export function getFieldContainerProps(widthInForm?: number | null): {
  className: string;
  style: Merge<CSSProperties, { '--field-w': string }>;
} {
  return {
    className: 'w-full min-w-0 sm:w-[var(--field-w)] sm:min-w-[200px]',
    style: { '--field-w': `calc(${widthInForm ?? 50}% - 1rem)` },
  };
}
