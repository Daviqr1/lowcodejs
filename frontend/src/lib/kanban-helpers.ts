import type { CSSProperties } from 'react';

import { hexToRgb } from '@/components/common/dynamic-table/table-cells/utils';
import { E_FIELD_TYPE } from '@/lib/constant';
import type {
  IDropdown,
  IField,
  IRow,
  IStorage,
  IUser,
} from '@/lib/interfaces';

export const ORDER_FIELD_SLUG = 'ordem-kanban';
export const ORDER_FIELD_NAME = 'Ordem Kanban';

// Tipos de campo cuja ordenação client-side de cards (compareRowsByField) produz
// uma ordem significativa. Texto/número (via format) e data comparam direto pelo
// valor; dropdown compara pelo label da opção. Os demais tipos (relationship,
// usuário, categoria, arquivo, grupo) guardam objetos no row e não ordenam de
// forma útil — ficam fora do select "Ordenar por".
export const SORTABLE_FIELD_TYPES = new Set<IField['type']>([
  E_FIELD_TYPE.TEXT_SHORT,
  E_FIELD_TYPE.TEXT_LONG,
  E_FIELD_TYPE.DATE,
  E_FIELD_TYPE.DROPDOWN,
]);

export const TEMPLATE_FIELD_SLUGS = new Set([
  'titulo',
  'descricao',
  'membros',
  'membros-notificados',
  'data-de-inicio',
  'data-de-vencimento',
  'porcentagem-concluida',
  'concluido-notificado',
  'status-anterior',
  'lista',
  'etiquetas',
  'tarefas',
  'comentarios',
]);

export function getFieldBySlug(
  fields: Array<IField>,
  slug: string,
  type?: IField['type'],
): IField | undefined {
  return fields.find(
    (f) => !f.trashed && f.slug === slug && (!type || f.type === type),
  );
}

export function getFirstFieldByType(
  fields: Array<IField>,
  type: IField['type'],
): IField | undefined {
  return fields.find((f) => !f.trashed && f.type === type);
}

export function normalizeRowValue(value: unknown): Array<string> {
  if (Array.isArray(value)) return value.map(String);
  if (value === null || value === undefined) return [];
  return [String(value)];
}

function extractId(item: unknown): string {
  if (typeof item === 'object' && item !== null) {
    if ('_id' in item && item._id != null) return String(item._id);
    if ('value' in item && item.value != null) return String(item.value);
  }
  return String(item);
}

function toUserOption(user: unknown): { value: string; label: string } {
  const value = extractId(user);
  let label = String(user);
  if (typeof user === 'object' && user !== null) {
    if ('name' in user && user.name) label = String(user.name);
    else if ('email' in user && user.email) label = String(user.email);
    else if ('label' in user && user.label) label = String(user.label);
  }
  return { value, label };
}

export function normalizeIdList(value: unknown): Array<string> {
  if (Array.isArray(value)) {
    return value.map(extractId).filter(Boolean);
  }

  if (typeof value === 'object' && value !== null) {
    return [extractId(value)].filter(Boolean);
  }

  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

function isStorageValue(value: unknown): value is IStorage {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_id' in value &&
    'url' in value &&
    'originalName' in value
  );
}

export function getAttachmentStorages(
  row: IRow,
  field?: IField,
): Array<IStorage> {
  if (!field) return [];
  const raw = row[field.slug];
  if (!Array.isArray(raw)) return [];

  if (field.type === E_FIELD_TYPE.FILE) {
    return raw.filter(isStorageValue);
  }

  if (field.type === E_FIELD_TYPE.FIELD_GROUP) {
    const fileFieldSlug = (field.group?.fields ?? []).find(
      (groupField: IField) => groupField.type === E_FIELD_TYPE.FILE,
    )?.slug;
    if (!fileFieldSlug) return [];

    const storages: Array<IStorage> = [];
    for (const groupRow of raw) {
      if (typeof groupRow !== 'object' || groupRow === null) continue;
      const groupRecord: Record<string, unknown> = groupRow;
      const files = groupRecord[fileFieldSlug];
      if (Array.isArray(files)) {
        storages.push(...files.filter(isStorageValue));
      } else if (isStorageValue(files)) {
        storages.push(files);
      }
    }
    return storages;
  }

  return [];
}

export function getUserInitials(user: Partial<IUser> | string): string {
  if (typeof user === 'string') return user.slice(0, 2).toUpperCase();
  const name = user.name || user.email || '';
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => {
    if (p[0]) return p[0].toUpperCase();
    return '';
  });
  return initials.join('') || 'U';
}

export function getMembersFromRow(
  row: IRow,
  field?: IField,
): Array<IUser | string> {
  if (!field) return [];
  const raw = row[field.slug];
  const isUser = (value: unknown): value is IUser =>
    typeof value === 'object' &&
    value !== null &&
    'email' in value &&
    'name' in value;
  const members: Array<IUser | string> = [];
  const push = (item: unknown): void => {
    if (typeof item === 'string') members.push(item);
    else if (isUser(item)) members.push(item);
  };
  if (Array.isArray(raw)) {
    for (const item of raw) push(item);
    return members;
  }
  push(raw);
  return members;
}

export function getProgressValue(row: IRow, field?: IField): number | null {
  if (!field) return null;
  const raw = row[field.slug];
  if (raw === null || raw === undefined || raw === '') return null;
  let parsed = Number(raw);
  if (typeof raw === 'number') parsed = raw;
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.min(100, parsed));
}

export function getTaskCompletionPercent(
  tasks: Array<Record<string, unknown>>,
): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((task) =>
    normalizeRowValue(task.realizado).includes('sim'),
  ).length;
  return Math.round((completed / tasks.length) * 100);
}

export function getTitleValue(row: IRow, field?: IField): string {
  if (!field) return 'Sem titulo';
  const raw = row[field.slug];
  if (raw === null || raw === undefined || raw === '') return 'Sem titulo';
  return String(raw);
}

/**
 * Monta o payload de atualização do campo "lista" (dropdown) do Kanban.
 * O GET serializa `category` como null em campos sem categoria, mas o validador
 * do backend espera um array — então normaliza para [] (mesmo padrão do
 * `buildFieldPayload` usado no gerenciamento de campos).
 */
export function buildListFieldPayload(
  listField: IField,
  dropdown: Array<IDropdown>,
): Record<string, unknown> {
  return {
    ...listField,
    dropdown,
    category: listField.category ?? [],
  };
}

export function parseOrderValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  let parsed = Number(value);
  if (typeof value === 'number') parsed = value;
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

/**
 * Extrai o valor escalar de um campo para ordenação client-side. Dropdown guarda
 * o id da opção no row, então resolve o label correspondente (fallback para o id
 * em dados legados); demais tipos usam o valor normalizado direto.
 */
function rowSortValue(row: IRow, field: IField): string | null {
  const raw = normalizeRowValue(row[field.slug])[0] ?? null;
  if (raw === null) return null;
  if (field.type === E_FIELD_TYPE.DROPDOWN) {
    const option = field.dropdown?.find((opt) => opt.id === raw);
    return option?.label ?? raw;
  }
  return raw;
}

/**
 * Compara dois registros por um campo, para ordenação ASC/DESC de cards
 * dentro de uma lista do Kanban. Valores vazios vão sempre para o final.
 * Usa localeCompare com `numeric` para tratar números e datas ISO.
 */
export function compareRowsByField(
  a: IRow,
  b: IRow,
  field: IField,
  direction: 'asc' | 'desc',
): number {
  const aValue = rowSortValue(a, field);
  const bValue = rowSortValue(b, field);
  if (aValue === null && bValue === null) return 0;
  if (aValue === null) return 1;
  if (bValue === null) return -1;
  const comparison = aValue.localeCompare(bValue, 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  });
  if (direction === 'desc') return -comparison;
  return comparison;
}

export function columnStyleFromColor(
  color?: string | null,
): CSSProperties | undefined {
  if (!color) return undefined;
  const rgb = hexToRgb(color);
  if (!rgb) return undefined;
  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`,
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`,
  };
}

export function columnHeaderStyleFromColor(
  color?: string | null,
): CSSProperties | undefined {
  if (!color) return undefined;
  const rgb = hexToRgb(color);
  if (!rgb) return undefined;
  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
  };
}

export function buildPayloadFromRow(
  row: IRow,
  fields: Array<IField>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    if (field.trashed || field.native) continue;
    const value = row[field.slug];

    switch (field.type) {
      case E_FIELD_TYPE.DROPDOWN:
      case E_FIELD_TYPE.CATEGORY:
        payload[field.slug] = normalizeRowValue(value);
        break;
      case E_FIELD_TYPE.USER:
      case E_FIELD_TYPE.USER_GROUP:
      case E_FIELD_TYPE.RELATIONSHIP:
      case E_FIELD_TYPE.FILE:
        payload[field.slug] = normalizeIdList(value);
        break;
      case E_FIELD_TYPE.FIELD_GROUP:
        if (Array.isArray(value)) payload[field.slug] = value;
        if (!Array.isArray(value)) payload[field.slug] = [];
        break;
      default:
        payload[field.slug] = value ?? null;
    }
  }

  return payload;
}

export function buildDefaultValuesFromRow(
  row: IRow,
  fields: Array<IField>,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const field of fields) {
    const value = row[field.slug];

    switch (field.type) {
      case E_FIELD_TYPE.USER: {
        let users: Array<unknown> = [];
        if (Array.isArray(value)) users = value;
        if (!Array.isArray(value) && value) users = [value];
        defaults[field.slug] = users.map(toUserOption);
        break;
      }
      case E_FIELD_TYPE.USER_GROUP:
        defaults[field.slug] = normalizeIdList(value);
        break;
      case E_FIELD_TYPE.DROPDOWN: {
        if (field.multiple) {
          let dropdownValue: Array<unknown> = [];
          if (Array.isArray(value)) dropdownValue = value;
          else if (value) dropdownValue = [value];
          defaults[field.slug] = dropdownValue;
        } else {
          if (Array.isArray(value)) defaults[field.slug] = value[0] ?? null;
          else defaults[field.slug] = value ?? null;
        }
        break;
      }
      case E_FIELD_TYPE.DATE:
        defaults[field.slug] = value ?? '';
        break;
      default:
        defaults[field.slug] = value ?? '';
    }
  }

  return defaults;
}
