import { E_FIELD_TYPE } from './constant';
import type { IField, IStorage, IUser } from './interfaces';

export type ReactionEntry = {
  emoji: string;
  users: Array<string>;
};

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function normalizeId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    if ('_id' in value && value._id != null) return String(value._id);
    if ('id' in value && value.id != null) return String(value.id);
    if ('value' in value && value.value != null) return String(value.value);
  }
  return null;
}

export function normalizeIdList(value: unknown): Array<string> {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeId(item))
      .filter((id): id is string => id !== null);
  }
  const id = normalizeId(value);
  if (id) return [id];
  return [];
}

export function normalizeUserList(value: unknown): Array<IUser | string> {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  // Valor único dinâmico: em runtime é um IUser populado ou um id string.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return [value as IUser | string];
}

export function normalizeStorageList(value: unknown): Array<IStorage> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is IStorage =>
      typeof item === 'object' &&
      item !== null &&
      'url' in item &&
      'originalName' in item,
  );
}

export function parseReactions(value: unknown): Array<ReactionEntry> {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (_error) {
      return [];
    }
  }
  return [];
}

export function serializeReactions(entries: Array<ReactionEntry>): string {
  return JSON.stringify(entries);
}

export function normalizeGroupFieldValue(
  field: IField,
  value: unknown,
): unknown {
  switch (field.type) {
    case E_FIELD_TYPE.TEXT_SHORT:
    case E_FIELD_TYPE.TEXT_LONG: {
      if (value === null || value === undefined) return '';
      return String(value);
    }
    case E_FIELD_TYPE.DATE: {
      if (!value) return null;
      if (value instanceof Date) return value.toISOString();
      return String(value);
    }
    case E_FIELD_TYPE.DROPDOWN:
    case E_FIELD_TYPE.CATEGORY: {
      let items: Array<unknown> = [];
      if (Array.isArray(value)) items = value;
      if (!Array.isArray(value) && value) items = [value];
      const values = items.map((item) => String(item));
      if (field.multiple) return values;
      return values.slice(0, 1);
    }
    case E_FIELD_TYPE.USER:
    case E_FIELD_TYPE.USER_GROUP:
    case E_FIELD_TYPE.FILE:
    case E_FIELD_TYPE.RELATIONSHIP: {
      const ids = normalizeIdList(value);
      if (field.multiple) return ids;
      return ids.slice(0, 1);
    }
    default:
      return value ?? null;
  }
}
