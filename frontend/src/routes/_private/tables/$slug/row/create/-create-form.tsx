import type { CSSProperties } from 'react';

import { TableRowHtmlContentField } from '@/components/common/dynamic-table/table-row/table-row-html-content-field';
import { withForm } from '@/integrations/tanstack-form/form-hook';
import { E_FIELD_FORMAT, E_FIELD_TYPE } from '@/lib/constant';
import type { IField, IStorage, Merge } from '@/lib/interfaces';
import type { CreateRowDefaultValue } from '@/lib/table';
import { buildFieldValidator, isManagedRelationship } from '@/lib/table';

type SearchableOption = {
  value: string;
  label: string;
};

function toDefaultArray(value: string | Array<string> | null): Array<string> {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) return [value];
  return [];
}

function toDefaultSearchableOptions(
  value: string | Array<string> | null,
): Array<SearchableOption> {
  return toDefaultArray(value).map((id) => ({ value: id, label: '' }));
}

// Valores de row são dinâmicos (campos definidos em runtime no TanStack Form),
// por isso `any` — o mapa não tem forma estática conhecida. Isolado neste alias.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RowValues = Record<string, any>;

// Helper: Build default values based on table fields.
export function buildDefaultValues(fields: Array<IField>): RowValues {
  const defaults: RowValues = {};

  for (const field of fields) {
    if (field.trashed) continue;

    switch (field.type) {
      case E_FIELD_TYPE.TEXT_SHORT:
      case E_FIELD_TYPE.TEXT_LONG:
        defaults[field.slug] = field.defaultValue ?? '';
        break;
      case E_FIELD_TYPE.DROPDOWN:
      case E_FIELD_TYPE.CATEGORY: {
        const arr = toDefaultArray(field.defaultValue);
        if (arr.length > 0) defaults[field.slug] = arr;
        if (arr.length === 0) defaults[field.slug] = [];
        break;
      }
      case E_FIELD_TYPE.DATE:
        if (typeof field.defaultValue === 'string' && field.defaultValue) {
          defaults[field.slug] = field.defaultValue;
        } else {
          defaults[field.slug] = '';
        }
        break;
      case E_FIELD_TYPE.FILE:
        defaults[field.slug] = {
          files: [],
          storages: [],
        };
        break;
      case E_FIELD_TYPE.RELATIONSHIP:
      case E_FIELD_TYPE.USER: {
        const opts = toDefaultSearchableOptions(field.defaultValue);
        if (opts.length > 0) defaults[field.slug] = opts;
        if (opts.length === 0) defaults[field.slug] = [];
        break;
      }
      default:
        defaults[field.slug] = '';
    }
  }

  return defaults;
}

// Helper: Build payload for API
export function buildPayload(
  values: RowValues,
  fields: Array<IField>,
): RowValues {
  const payload: RowValues = {};

  for (const field of fields) {
    if (field.trashed) continue;

    const value = values[field.slug];

    switch (field.type) {
      case E_FIELD_TYPE.TEXT_SHORT:
      case E_FIELD_TYPE.TEXT_LONG:
        payload[field.slug] = value || null;
        break;
      case E_FIELD_TYPE.DROPDOWN: {
        const existing = values[field.slug];
        if (field.multiple) {
          let ids: Array<unknown> = [];
          if (Array.isArray(existing)) ids = existing;
          else if (existing) ids = [existing];
          payload[field.slug] = ids;
        } else {
          let id: unknown = existing ?? null;
          if (Array.isArray(existing)) id = existing[0] ?? null;
          // Always array, but limit to 1 item
          if (id) payload[field.slug] = [id];
          if (!id) payload[field.slug] = [];
        }
        break;
      }
      case E_FIELD_TYPE.DATE:
        payload[field.slug] = value || null;
        break;
      case E_FIELD_TYPE.FILE: {
        const fileValue: {
          files: Array<File>;
          storages: Array<IStorage>;
        } = value;
        if (field.multiple) {
          payload[field.slug] = fileValue.storages.map((s) => s._id);
        } else {
          // Always array, but limit to 1 item
          payload[field.slug] = fileValue.storages
            .slice(0, 1)
            .map((s) => s._id);
        }
        break;
      }
      case E_FIELD_TYPE.RELATIONSHIP: {
        const relValue = Array.from<SearchableOption>(value ?? []);
        if (field.multiple) {
          payload[field.slug] = relValue.map((opt) => opt.value);
        } else {
          // Always array, but limit to 1 item
          payload[field.slug] = relValue.slice(0, 1).map((opt) => opt.value);
        }
        break;
      }
      case E_FIELD_TYPE.CATEGORY: {
        let categoryValue: Array<unknown> = [];
        if (Array.isArray(value)) categoryValue = value;
        else if (value) categoryValue = [value];
        if (field.multiple) {
          payload[field.slug] = categoryValue;
        } else {
          // Always array, but limit to 1 item
          payload[field.slug] = categoryValue.slice(0, 1);
        }
        break;
      }
      case E_FIELD_TYPE.USER: {
        const userValue = Array.from<SearchableOption>(value ?? []);
        if (field.multiple) {
          payload[field.slug] = userValue.map((opt) => opt.value);
        } else {
          // Always array, but limit to 1 item
          payload[field.slug] = userValue.slice(0, 1).map((opt) => opt.value);
        }
        break;
      }
      case E_FIELD_TYPE.FIELD_GROUP: {
        if (!Array.isArray(value)) {
          payload[field.slug] = value || null;
          break;
        }
        payload[field.slug] = value.map((item: Record<string, unknown>) => {
          const normalized: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(item)) {
            // Normalize FILE sub-fields: { files, storages } -> array of IDs
            if (
              val &&
              typeof val === 'object' &&
              !Array.isArray(val) &&
              'storages' in val &&
              Array.isArray(val.storages)
            ) {
              normalized[key] = val.storages.map((s) => s._id);
            } else {
              normalized[key] = val;
            }
          }
          return normalized;
        });
        break;
      }
      default:
        payload[field.slug] = value || null;
    }
  }

  return payload;
}

// Validator for required fields
type RequiredValidator = {
  onChange: ({ value }: { value: unknown }) => string | undefined;
};

export function createRequiredValidator(fieldName: string): RequiredValidator {
  const validate = ({ value }: { value: unknown }): string | undefined => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} é obrigatório`;
    }
    if (Array.isArray(value) && value.length === 0) {
      return `${fieldName} é obrigatório`;
    }
    if (typeof value === 'object' && 'storages' in value) {
      // value já checado como objeto com `storages` em runtime.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const storageValue = value as { storages: Array<IStorage> };
      if (storageValue.storages.length === 0) {
        return `${fieldName} é obrigatório`;
      }
    }
    return undefined;
  };

  return {
    onChange: validate,
  };
}

// withForm dá o `form` tipado (fieldComponents inferidos no AppField) sem passar
// o form como `any`. defaultValues/props só p/ type-check; o form de row
// dinâmico (Record<string, FieldValue>) vem do useAppForm do caller.
type RowFormFieldsProps = {
  fields: Array<IField>;
  disabled: boolean;
  tableSlug: string;
  rowId?: string;
};

const ROW_FORM_FIELDS_DEFAULT_VALUES: CreateRowDefaultValue = {};

const ROW_FORM_FIELDS_DEFAULT_PROPS: RowFormFieldsProps = {
  fields: [],
  disabled: false,
  tableSlug: '',
};

export const RowFormFields = withForm({
  defaultValues: ROW_FORM_FIELDS_DEFAULT_VALUES,
  props: ROW_FORM_FIELDS_DEFAULT_PROPS,
  render: function Render({ form, fields, disabled, tableSlug, rowId }) {
    return (
      <section
        className="flex flex-wrap gap-4 p-3 sm:p-2"
        data-test-id="create-row-fields"
      >
        {fields.map((field) => {
          // Skip native fields (_id, creator, createdAt)
          if (field.native) return null;

          // Skip non-editable field types. RELATIONSHIP em modo 'manage' é
          // renderizado pelo repetidor (RelationshipRowsInline); em modo 'select'
          // (padrão) cai no switch abaixo como combobox de vínculo direto.
          if (
            field.type === E_FIELD_TYPE.REACTION ||
            field.type === E_FIELD_TYPE.EVALUATION ||
            field.type === E_FIELD_TYPE.FIELD_GROUP
          ) {
            return null;
          }
          // Só N:N 'manage' é renderizado pelo repetidor; 1:1/1:N caem no combobox.
          if (isManagedRelationship(field)) {
            return null;
          }

          if (field.type === E_FIELD_TYPE.HTML_CONTENT) {
            return (
              <div
                key={field._id}
                style={{ width: '100%' }}
              >
                <TableRowHtmlContentField field={field} />
              </div>
            );
          }

          // Largura configurável por campo vira CSS var: full-width no mobile,
          // largura % definida só a partir de sm (ver className). O tipo Merge
          // libera a custom property sem `as` no style inline.
          const fieldStyle: Merge<CSSProperties, { '--field-w': string }> = {
            '--field-w': `calc(${field.widthInForm ?? 50}% - 1rem)`,
          };

          return (
            <div
              key={field._id}
              className="w-full min-w-0 sm:w-[var(--field-w)] sm:min-w-[200px]"
              style={fieldStyle}
            >
              <form.AppField
                name={field.slug}
                validators={{
                  onChange: ({ value }) => {
                    return buildFieldValidator(field, value);
                  },
                  onBlur: ({ value }) => {
                    return buildFieldValidator(field, value);
                  },
                }}
              >
                {(formField) => {
                  switch (field.type) {
                    case E_FIELD_TYPE.TEXT_SHORT:
                      return (
                        <formField.TableRowTextField
                          field={field}
                          disabled={disabled}
                        />
                      );
                    case E_FIELD_TYPE.TEXT_LONG:
                      if (field.format === E_FIELD_FORMAT.RICH_TEXT) {
                        return (
                          <formField.TableRowRichTextField
                            field={field}
                            disabled={disabled}
                          />
                        );
                      }
                      return (
                        <formField.TableRowTextareaField
                          field={field}
                          disabled={disabled}
                        />
                      );
                    case E_FIELD_TYPE.DROPDOWN:
                      return (
                        <formField.TableRowDropdownField
                          field={field}
                          disabled={disabled}
                          tableSlug={tableSlug}
                        />
                      );
                    case E_FIELD_TYPE.DATE:
                      return (
                        <formField.TableRowDateField
                          field={field}
                          disabled={disabled}
                        />
                      );
                    case E_FIELD_TYPE.FILE:
                      return (
                        <formField.TableRowFileField
                          field={field}
                          disabled={disabled}
                        />
                      );
                    case E_FIELD_TYPE.RELATIONSHIP:
                      return (
                        <formField.TableRowRelationshipField
                          field={field}
                          disabled={disabled}
                          tableSlug={tableSlug}
                          rowId={rowId}
                        />
                      );
                    case E_FIELD_TYPE.CATEGORY:
                      return (
                        <formField.TableRowCategoryField
                          field={field}
                          disabled={disabled}
                        />
                      );
                    case E_FIELD_TYPE.USER:
                      return (
                        <formField.TableRowUserField
                          field={field}
                          disabled={disabled}
                        />
                      );
                    default:
                      return null;
                  }
                }}
              </form.AppField>
            </div>
          );
        })}
      </section>
    );
  },
});
