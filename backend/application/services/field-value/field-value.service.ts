import { Service } from 'fastify-decorators';

import {
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  type IField,
} from '@application/core/entity.core';
import { TypeGuardContractService } from '@application/services/type-guard/type-guard-contract.service';

import type {
  FieldType,
  FieldValueFormatContext,
  RelationshipValueResolver,
} from './field-value-contract.service';
import { FieldValueContractService } from './field-value-contract.service';

const HTML_TAG_REGEX = /<[^>]*>/g;
const WHITESPACE_REGEX = /\s+/g;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;

// Exportados como display name / filename — nao ha como reconstituir os ids no
// import, entao a celula e descartada.
const UNSUPPORTED_IMPORT_TYPES = new Set<FieldType>([
  E_FIELD_TYPE.USER,
  E_FIELD_TYPE.USER_GROUP,
  E_FIELD_TYPE.FILE,
  E_FIELD_TYPE.FIELD_GROUP,
]);

// Exportados como "valor1; valor2" — o import reconstroi o array.
const MULTI_VALUE_TYPES = new Set<FieldType>([
  E_FIELD_TYPE.DROPDOWN,
  E_FIELD_TYPE.CATEGORY,
]);

// Tipos que armazenam `defaultValue` como string[].
const ARRAY_DEFAULT_VALUE_TYPES = new Set([
  'DROPDOWN',
  'CATEGORY',
  'USER',
  'USER_GROUP',
  'RELATIONSHIP',
]);

// Tipos que armazenam `defaultValue` como string.
const STRING_DEFAULT_VALUE_TYPES = new Set(['TEXT_SHORT', 'TEXT_LONG', 'DATE']);

// Chaves tentadas, em ordem, para rotular um relacionamento populado.
const RELATION_DISPLAY_KEYS = [
  'name',
  'title',
  'label',
  'email',
  'slug',
] as const;

function stripHtml(value: string): string {
  return value
    .replace(HTML_TAG_REGEX, ' ')
    .replace(WHITESPACE_REGEX, ' ')
    .trim();
}

@Service()
export default class FieldValueService implements FieldValueContractService {
  constructor(private readonly typeGuard: TypeGuardContractService) {}

  typeOf(fields: IField[], slug: string): FieldType | undefined {
    return fields.find((field) => field.slug === slug)?.type;
  }

  read(doc: Record<string, unknown>, slug: string): unknown {
    if (slug in doc) return doc[slug];

    const underscored = slug.replace(/-/g, '_');
    if (underscored in doc) return doc[underscored];

    const hyphenated = slug.replace(/_/g, '-');
    if (hyphenated in doc) return doc[hyphenated];

    return undefined;
  }

  infer(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();

    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;

    if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
      const numeric = Number(trimmed);
      if (Number.isInteger(numeric)) return numeric;
      return parseFloat(trimmed);
    }

    if (ISO_DATE_REGEX.test(trimmed)) {
      const date = new Date(trimmed);
      if (!Number.isNaN(date.getTime())) return date;
    }

    return value;
  }

  coerce(
    raw: string,
    field: IField,
    resolveRelationship?: RelationshipValueResolver,
  ): unknown {
    if (field.type === E_FIELD_TYPE.RELATIONSHIP) {
      if (raw === '') return undefined;
      if (!resolveRelationship) return undefined;

      const ids = resolveRelationship(raw);
      if (ids.length === 0) return undefined;
      return ids;
    }

    if (UNSUPPORTED_IMPORT_TYPES.has(field.type)) return undefined;
    if (raw === '') return undefined;

    if (field.type === E_FIELD_TYPE.DATE) {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) return parsed;
      return raw;
    }

    if (MULTI_VALUE_TYPES.has(field.type)) {
      return raw
        .split(';')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
    }

    if (field.format === E_FIELD_FORMAT.INTEGER) {
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed)) return parsed;
      return raw;
    }

    if (field.format === E_FIELD_FORMAT.DECIMAL) {
      const parsed = parseFloat(raw);
      if (!Number.isNaN(parsed)) return parsed;
      return raw;
    }

    return raw;
  }

  format(value: unknown, context: FieldValueFormatContext = {}): string {
    if (value === null || value === undefined) return '';

    if (value instanceof Date) return value.toISOString();

    if (typeof value === 'boolean') {
      if (value) return 'true';
      return 'false';
    }

    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }

    if (typeof value === 'string') {
      if (context.fieldType === E_FIELD_TYPE.TEXT_LONG) return stripHtml(value);
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.format(item, context))
        .filter((text) => text.length > 0)
        .join('; ');
    }

    if (this.typeGuard.isRecord(value)) {
      if (context.fieldType === E_FIELD_TYPE.FILE) {
        return this.formatFile(value, context);
      }

      if (typeof value.label === 'string') return value.label;

      const display = this.pickRelationDisplay(value);
      if (display) return display;

      try {
        return JSON.stringify(value);
      } catch {
        return '';
      }
    }

    return String(value);
  }

  normalizeDefault(
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
      if (typeof defaultValue === 'string' && defaultValue) return defaultValue;
      if (Array.isArray(defaultValue) && defaultValue.length > 0) {
        return defaultValue[0];
      }
      return null;
    }

    return null;
  }

  hasDuplicateLabels(
    dropdown: Array<{ label: string }> | null | undefined,
  ): boolean {
    if (!dropdown || dropdown.length === 0) return false;

    const seen = new Set<string>();

    for (const item of dropdown) {
      const label = item.label.trim().toLowerCase();
      if (seen.has(label)) return true;
      seen.add(label);
    }

    return false;
  }

  private formatFile(
    value: Record<string, unknown>,
    context: FieldValueFormatContext,
  ): string {
    let filename: string | null = null;
    if (typeof value.originalName === 'string') filename = value.originalName;

    let url: string | null = null;
    if (typeof value.url === 'string') url = value.url;

    if (context.preferUrlForFiles && url) return url;
    return filename ?? url ?? '';
  }

  private pickRelationDisplay(value: Record<string, unknown>): string {
    for (const key of RELATION_DISPLAY_KEYS) {
      const candidate = value[key];
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }

    if (typeof value._id === 'string') return value._id;
    return '';
  }
}
