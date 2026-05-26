import { E_FIELD_FORMAT, E_FIELD_TYPE } from '@/lib/constant';
import type { IField, IStorage } from '@/lib/interfaces';
import { buildFieldValidator } from '@/lib/table';

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

// Helper: Build default values based on table fields
export function buildDefaultValues(fields: Array<IField>): Record<string, any> {
  const defaults: Record<string, any> = {};

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
        defaults[field.slug] = arr.length > 0 ? arr : [];
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
          files: [] as Array<File>,
          storages: [] as Array<IStorage>,
        };
        break;
      case E_FIELD_TYPE.RELATIONSHIP:
      case E_FIELD_TYPE.USER: {
        const opts = toDefaultSearchableOptions(field.defaultValue);
        defaults[field.slug] = opts.length > 0 ? opts : [];
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
  values: Record<string, any>,
  fields: Array<IField>,
): Record<string, any> {
  const payload: Record<string, any> = {};

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
          const ids = Array.isArray(existing)
            ? existing
            : existing
              ? [existing]
              : [];
          payload[field.slug] = ids as Array<string>;
        } else {
          const id = Array.isArray(existing)
            ? (existing[0] ?? null)
            : (existing ?? null);
          // Always array, but limit to 1 item
          payload[field.slug] = id ? [id] : [];
        }
        break;
      }
      case E_FIELD_TYPE.DATE:
        payload[field.slug] = value || null;
        break;
      case E_FIELD_TYPE.FILE: {
        const fileValue = value as {
          files: Array<File>;
          storages: Array<IStorage>;
        };
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
        const categoryValue = Array.isArray(value)
          ? value
          : value
            ? [value]
            : [];
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
        payload[field.slug] = value.map((item: Record<string, any>) => {
          const normalized: Record<string, any> = {};
          for (const [key, val] of Object.entries(item)) {
            // Normalize FILE sub-fields: { files, storages } -> array of IDs
            if (
              val &&
              typeof val === 'object' &&
              !Array.isArray(val) &&
              'storages' in val
            ) {
              const fileVal = val as {
                files: Array<File>;
                storages: Array<IStorage>;
              };
              normalized[key] = fileVal.storages.map((s) => s._id);
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
  onChange: ({ value }: { value: any }) => string | undefined;
};

export function createRequiredValidator(fieldName: string): RequiredValidator {
  const validate = ({ value }: { value: any }): string | undefined => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} é obrigatório`;
    }
    if (Array.isArray(value) && value.length === 0) {
      return `${fieldName} é obrigatório`;
    }
    if (typeof value === 'object' && 'storages' in value) {
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

interface RowFormFieldsProps {
  form: any;
  fields: Array<IField>;
  disabled: boolean;
  tableSlug: string;
  disabledFields?: ReadonlySet<string>;
}

export function RowFormFields({
  form,
  fields,
  disabled,
  tableSlug,
  disabledFields,
}: RowFormFieldsProps): React.JSX.Element {
  return (
    <section
      className="flex flex-wrap gap-4 p-2"
      data-test-id="create-row-fields"
    >
      {fields.map((field) => {
        // Skip native fields (_id, creator, createdAt)
        if (field.native) return null;

        // Skip non-editable field types
        if (
          field.type === E_FIELD_TYPE.REACTION ||
          field.type === E_FIELD_TYPE.EVALUATION ||
          field.type === E_FIELD_TYPE.FIELD_GROUP
        ) {
          return null;
        }

        const fieldDisabled =
          disabled || (disabledFields?.has(field.slug) ?? false);

        return (
          <div
            key={field._id}
            className="min-w-[200px]"
            style={{ width: `calc(${field.widthInForm ?? 50}% - 1rem)` }}
          >
            <form.AppField
              name={field.slug}
              validators={{
                onChange: ({ value }: { value: any }) => {
                  return buildFieldValidator(field, value);
                },
              }}
            >
              {(formField: any) => {
                switch (field.type) {
                  case E_FIELD_TYPE.TEXT_SHORT:
                    return (
                      <formField.TableRowTextField
                        field={field}
                        disabled={fieldDisabled}
                      />
                    );
                  case E_FIELD_TYPE.TEXT_LONG:
                    if (field.format === E_FIELD_FORMAT.RICH_TEXT) {
                      return (
                        <formField.TableRowRichTextField
                          field={field}
                          disabled={fieldDisabled}
                        />
                      );
                    }
                    return (
                      <formField.TableRowTextareaField
                        field={field}
                        disabled={fieldDisabled}
                      />
                    );
                  case E_FIELD_TYPE.DROPDOWN:
                    return (
                      <formField.TableRowDropdownField
                        field={field}
                        disabled={fieldDisabled}
                        tableSlug={tableSlug}
                      />
                    );
                  case E_FIELD_TYPE.DATE:
                    return (
                      <formField.TableRowDateField
                        field={field}
                        disabled={fieldDisabled}
                      />
                    );
                  case E_FIELD_TYPE.FILE:
                    return (
                      <formField.TableRowFileField
                        field={field}
                        disabled={fieldDisabled}
                      />
                    );
                  case E_FIELD_TYPE.RELATIONSHIP:
                    return (
                      <formField.TableRowRelationshipField
                        field={field}
                        disabled={fieldDisabled}
                      />
                    );
                  case E_FIELD_TYPE.CATEGORY:
                    return (
                      <formField.TableRowCategoryField
                        field={field}
                        disabled={fieldDisabled}
                      />
                    );
                  case E_FIELD_TYPE.USER:
                    return (
                      <formField.TableRowUserField
                        field={field}
                        disabled={fieldDisabled}
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
}
