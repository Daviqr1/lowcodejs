import React from 'react';

import { E_FIELD_FORMAT, E_FIELD_TYPE } from '@/lib/constant';
import type { IField, IGroup, IRow, IStorage, IUser } from '@/lib/interfaces';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStorageValue(
  value: unknown,
): value is { storages: Array<IStorage> } {
  return isRecord(value) && Array.isArray(value.storages);
}

function optionId(option: unknown): unknown {
  if (isRecord(option)) return option.value ?? option._id;
  return option;
}

// Coercao generica: o chamador conhece T; o valor vem solto (unknown) e por isso
// o cast e inerente ao helper.
export function toArray<T>(value: unknown): Array<T> {
  if (Array.isArray(value)) return value;
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  if (value !== null && value !== undefined) return [value] as Array<T>;
  return [];
}

export function transformFieldValueForEdit(
  value: unknown,
  field: IField,
): unknown {
  if (value === null || value === undefined) {
    return getFieldDefault(field);
  }

  switch (field.type) {
    case E_FIELD_TYPE.TEXT_SHORT:
    case E_FIELD_TYPE.TEXT_LONG:
      return value || '';

    case E_FIELD_TYPE.DATE:
      return value ?? '';

    case E_FIELD_TYPE.DROPDOWN:
    case E_FIELD_TYPE.CATEGORY: {
      return toArray<string>(value);
    }

    case E_FIELD_TYPE.FILE: {
      const storages = toArray<IStorage>(value);
      return { files: [], storages };
    }

    case E_FIELD_TYPE.RELATIONSHIP: {
      const rows = toArray<IRow>(value);
      const relConfig = field.relationship;
      const labelField = relConfig?.field.slug ?? '_id';

      return rows.map((row) => ({
        value: row._id,
        label: String(row[labelField] ?? row._id),
      }));
    }

    case E_FIELD_TYPE.USER: {
      const users = toArray<IUser>(value);
      return users.map((user) => {
        if (typeof user === 'object' && user !== null) {
          return { value: user._id, label: user.name };
        }
        return { value: String(user), label: String(user) };
      });
    }

    case E_FIELD_TYPE.USER_GROUP: {
      const groups = toArray<IGroup>(value);
      return groups.map((group) => {
        if (typeof group === 'object' && group !== null) return group._id;
        return String(group);
      });
    }

    default:
      return value ?? '';
  }
}

export function getFieldDefault(field: IField): unknown {
  switch (field.type) {
    case E_FIELD_TYPE.TEXT_SHORT:
    case E_FIELD_TYPE.TEXT_LONG:
      return field.defaultValue ?? '';
    case E_FIELD_TYPE.DATE:
      if (typeof field.defaultValue === 'string' && field.defaultValue) {
        return field.defaultValue;
      }
      return '';
    case E_FIELD_TYPE.DROPDOWN:
      if (Array.isArray(field.defaultValue) && field.defaultValue.length > 0) {
        return field.defaultValue;
      }
      return [];
    case E_FIELD_TYPE.CATEGORY:
    case E_FIELD_TYPE.USER_GROUP:
      if (Array.isArray(field.defaultValue) && field.defaultValue.length > 0) {
        return field.defaultValue;
      }
      return [];
    case E_FIELD_TYPE.RELATIONSHIP:
    case E_FIELD_TYPE.USER:
      if (Array.isArray(field.defaultValue) && field.defaultValue.length > 0) {
        return field.defaultValue.map((id: string) => ({
          value: id,
          label: '',
        }));
      }
      return [];
    case E_FIELD_TYPE.FILE:
      return { storages: [], files: [] };
    default:
      return '';
  }
}

export function buildGroupRowPayload(
  values: Record<string, unknown>,
  fields: Array<IField>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    const value = values[field.slug];

    switch (field.type) {
      case E_FIELD_TYPE.TEXT_SHORT:
      case E_FIELD_TYPE.TEXT_LONG:
        payload[field.slug] = value || null;
        break;
      case E_FIELD_TYPE.DROPDOWN:
      case E_FIELD_TYPE.CATEGORY:
      case E_FIELD_TYPE.USER_GROUP: {
        let arr: Array<unknown> = [];
        if (Array.isArray(value)) {
          arr = value;
        } else if (value) {
          arr = [value];
        }
        if (field.multiple) {
          payload[field.slug] = arr;
        } else {
          payload[field.slug] = arr.slice(0, 1);
        }
        break;
      }
      case E_FIELD_TYPE.DATE:
        payload[field.slug] = value || null;
        break;
      case E_FIELD_TYPE.FILE: {
        if (isStorageValue(value)) {
          const ids = value.storages.map((s) => s._id);
          if (field.multiple) {
            payload[field.slug] = ids;
          } else {
            payload[field.slug] = ids.slice(0, 1);
          }
        } else {
          payload[field.slug] = [];
        }
        break;
      }
      case E_FIELD_TYPE.RELATIONSHIP:
      case E_FIELD_TYPE.USER: {
        let opts: Array<unknown> = [];
        if (Array.isArray(value)) {
          opts = value;
        }
        const ids = opts.map(optionId);
        if (field.multiple) {
          payload[field.slug] = ids;
        } else {
          payload[field.slug] = ids.slice(0, 1);
        }
        break;
      }
      default:
        payload[field.slug] = value || null;
    }
  }

  return payload;
}

export function renderGroupFormField(
  // formField expõe componentes de campo do app (TableRow*) — sem tipo exportado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formField: any,
  field: IField,
  tableSlug: string,
  groupSlug: string,
): React.JSX.Element | null {
  switch (field.type) {
    case E_FIELD_TYPE.TEXT_SHORT:
      return (
        <formField.TableRowTextField
          field={field}
          disabled={false}
        />
      );
    case E_FIELD_TYPE.TEXT_LONG:
      if (field.format === E_FIELD_FORMAT.RICH_TEXT) {
        return (
          <formField.TableRowRichTextField
            field={field}
            disabled={false}
          />
        );
      }
      return (
        <formField.TableRowTextareaField
          field={field}
          disabled={false}
        />
      );
    case E_FIELD_TYPE.DROPDOWN:
      return (
        <formField.TableRowDropdownField
          field={field}
          disabled={false}
          tableSlug={tableSlug}
          groupSlug={groupSlug}
        />
      );
    case E_FIELD_TYPE.DATE:
      return (
        <formField.TableRowDateField
          field={field}
          disabled={false}
        />
      );
    case E_FIELD_TYPE.FILE:
      return (
        <formField.TableRowFileField
          field={field}
          disabled={false}
        />
      );
    case E_FIELD_TYPE.RELATIONSHIP:
      return (
        <formField.TableRowRelationshipField
          field={field}
          disabled={false}
          tableSlug={tableSlug}
        />
      );
    case E_FIELD_TYPE.CATEGORY:
      return (
        <formField.TableRowCategoryField
          field={field}
          disabled={false}
        />
      );
    case E_FIELD_TYPE.USER:
      return (
        <formField.TableRowUserField
          field={field}
          disabled={false}
        />
      );
    case E_FIELD_TYPE.USER_GROUP:
      return (
        <formField.TableRowUserGroupField
          field={field}
          disabled={false}
        />
      );
    default:
      return null;
  }
}
