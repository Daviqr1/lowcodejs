import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Loader2Icon, PlusIcon } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { getDropdownContrastStyle } from '../table-cells/utils';

import { splitVisibleChips } from './table-row-chips-limit';
import { TableRowFieldLabel } from './table-row-field-label';

import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { Field, FieldError } from '@/components/ui/field';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { API } from '@/lib/api';
import { getNextDropdownOptionColor } from '@/lib/dropdown-colors';
import type { IDropdown, IField, ITable, Paginated } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';

type TableRowDropdownFieldProps = {
  field: IField;
  disabled?: boolean;
  tableSlug?: string;
  groupSlug?: string;
};

type DropdownOption = {
  value: string;
  label: string;
  color?: string | null;
};

function normalizeDropdownLabel(label: string): string {
  return label.trim().toLowerCase();
}

function hasDropdownOptionLabel(
  dropdown: Array<DropdownOption>,
  label: string,
): boolean {
  const normalizedLabel = normalizeDropdownLabel(label);
  return dropdown.some(
    (item) => normalizeDropdownLabel(item.label) === normalizedLabel,
  );
}

function appendUniqueDropdownOption(
  dropdown: Array<IDropdown>,
  option: IDropdown,
): Array<IDropdown> {
  const normalizedLabel = normalizeDropdownLabel(option.label);
  const currentDropdown = dropdown.filter((item) => {
    return (
      item.id !== option.id &&
      normalizeDropdownLabel(String(item.label)) !== normalizedLabel
    );
  });

  return [...currentDropdown, option];
}

function buildFieldUpdatePayload(
  field: IField,
  dropdown: Array<IDropdown>,
): Record<string, unknown> {
  let relationship = null;
  if (field.relationship) {
    relationship = {
      table: {
        _id: field.relationship.table._id,
        slug: field.relationship.table.slug,
      },
      field: {
        _id: field.relationship.field._id,
        slug: field.relationship.field.slug,
      },
      order: field.relationship.order,
    };
  }
  return {
    name: field.name,
    type: field.type,
    required: field.required,
    multiple: field.multiple,
    showInFilter: field.showInFilter,
    permissions: field.permissions,
    widthInForm: field.widthInForm,
    widthInList: field.widthInList,
    widthInDetail: field.widthInDetail,
    tip: field.tip ?? null,
    format: field.format ?? null,
    defaultValue: field.defaultValue ?? null,
    dropdown,
    allowCustomDropdownOptions: field.allowCustomDropdownOptions ?? false,
    allowCreateRelationshipRecords:
      field.allowCreateRelationshipRecords ?? false,
    relationship,
    group: field.group,
    category: field.category ?? [],
    trashed: field.trashed,
    trashedAt: field.trashedAt ?? null,
  };
}

function getCustomOptionErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return 'Erro ao criar nova opção do dropdown';
  }

  const data:
    | { message?: string; errors?: Record<string, string> }
    | undefined = error.response?.data;

  return (
    data?.errors?.dropdown ??
    data?.message ??
    'Erro ao criar nova opção do dropdown'
  );
}

function replaceFieldInTable(
  table: ITable,
  field: IField,
  groupSlug?: string,
): ITable {
  if (groupSlug) {
    return {
      ...table,
      groups: (table.groups ?? []).map((group) => {
        if (group.slug !== groupSlug) return group;
        return {
          ...group,
          fields: (group.fields ?? []).map((groupField) => {
            if (groupField._id === field._id) return field;
            return groupField;
          }),
        };
      }),
    };
  }

  return {
    ...table,
    fields: (table.fields ?? []).map((tableField) => {
      if (tableField._id === field._id) return field;
      return tableField;
    }),
  };
}

function normalizeDropdownValues(
  value: DropdownOption | Array<DropdownOption> | string | Array<string> | null,
): Array<string> {
  if (!value) return [];
  let values: Array<DropdownOption | string>;
  if (Array.isArray(value)) {
    values = value;
  } else {
    values = [value];
  }
  return values
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'value' in item) {
        return String(item.value);
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

export function TableRowDropdownField({
  field,
  disabled,
  tableSlug,
  groupSlug,
}: TableRowDropdownFieldProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const formField = useFieldContext<Array<string>>();
  const isInvalid =
    formField.state.meta.isTouched && !formField.state.meta.isValid;
  const errorId = `${formField.name}-error`;
  const isMultiple = field.multiple;
  const anchorRef = useComboboxAnchor();
  const [inputValue, setInputValue] = React.useState('');
  const [localDropdown, setLocalDropdown] = React.useState<Array<IDropdown>>(
    () => field.dropdown ?? [],
  );

  React.useEffect(() => {
    setLocalDropdown(field.dropdown ?? []);
  }, [field.dropdown]);

  const items: Array<DropdownOption> = React.useMemo(() => {
    return localDropdown.map((d: IDropdown) => ({
      value: String(d.id),
      label: String(d.label),
      color: d.color ?? null,
    }));
  }, [localDropdown]);

  const selectedIds = React.useMemo(() => {
    return normalizeDropdownValues(formField.state.value);
  }, [formField.state.value]);

  React.useEffect(() => {
    if (!isMultiple) return;
    if (Array.isArray(formField.state.value)) return;
    formField.handleChange(selectedIds);
  }, [formField, isMultiple, selectedIds]);

  const selectedOptions = React.useMemo(() => {
    return items.filter((item) => selectedIds.includes(item.value));
  }, [items, selectedIds]);

  const customLabel = inputValue.trim();
  const canCreateCustomOption =
    Boolean(field.allowCustomDropdownOptions) &&
    Boolean(tableSlug) &&
    !disabled &&
    customLabel.length > 0 &&
    !hasDropdownOptionLabel(items, customLabel);

  const createCustomOptionMutation = useMutation({
    mutationFn: async (newOption: IDropdown) => {
      if (!tableSlug) {
        throw new Error('Tabela não informada para atualizar opções');
      }

      const nextDropdown = appendUniqueDropdownOption(localDropdown, newOption);
      const data = buildFieldUpdatePayload(field, nextDropdown);
      let route = `/tables/${tableSlug}/fields/${field._id}`;
      if (groupSlug) {
        route = `/tables/${tableSlug}/groups/${groupSlug}/fields/${field._id}`;
      }
      const response = await API.put<IField>(route, data);
      return response.data;
    },
    onSuccess(response) {
      setLocalDropdown(response.dropdown ?? []);

      let detailKey:
        | ReturnType<typeof queryKeys.fields.detail>
        | ReturnType<typeof queryKeys.groupFields.detail> =
        queryKeys.fields.detail(tableSlug!, response._id);
      if (groupSlug) {
        detailKey = queryKeys.groupFields.detail(
          tableSlug!,
          groupSlug,
          response._id,
        );
      }
      queryClient.setQueryData<IField>(detailKey, response);

      queryClient.setQueryData<ITable>(
        queryKeys.tables.detail(tableSlug!),
        (old) => {
          if (!old) return old;
          return replaceFieldInTable(old, response, groupSlug);
        },
      );

      queryClient.setQueriesData<Paginated<ITable>>(
        { queryKey: queryKeys.tables.lists() },
        (old) => {
          if (!old) return old;
          return {
            meta: old.meta,
            data: old.data.map((table) => {
              if (table.slug !== tableSlug) return table;
              return replaceFieldInTable(table, response, groupSlug);
            }),
          };
        },
      );

      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(tableSlug!),
      });
    },
    onError(error) {
      toast.error(getCustomOptionErrorMessage(error));
    },
  });

  const createCustomOption = async (): Promise<void> => {
    if (!canCreateCustomOption || createCustomOptionMutation.isPending) return;

    const previousDropdown = localDropdown;
    const previousSelectedIds = selectedIds;

    const newOption: IDropdown = {
      id: crypto.randomUUID(),
      label: customLabel,
      color: getNextDropdownOptionColor(localDropdown.length),
    };

    setLocalDropdown((current) =>
      appendUniqueDropdownOption(current, newOption),
    );

    if (isMultiple) {
      formField.handleChange([...selectedIds, newOption.id]);
    } else {
      formField.handleChange([newOption.id]);
    }
    formField.handleBlur();
    setInputValue('');

    try {
      await createCustomOptionMutation.mutateAsync(newOption);
    } catch {
      setLocalDropdown(previousDropdown);
      formField.handleChange(previousSelectedIds);
    }
  };

  const handleValueChange = (
    value:
      | DropdownOption
      | Array<DropdownOption>
      | string
      | Array<string>
      | null,
  ): void => {
    const nextValues = normalizeDropdownValues(value);
    if (nextValues.length === 0) {
      formField.handleChange([]);
      setInputValue('');
      return;
    }
    formField.handleChange(nextValues);
    setInputValue('');
  };

  const handleInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key !== 'Enter' || !canCreateCustomOption) return;
    event.preventDefault();
    void createCustomOption();
  };

  let createOptionContent = (
    <ComboboxEmpty>Nenhuma opção encontrada</ComboboxEmpty>
  );
  if (canCreateCustomOption) {
    createOptionContent = (
      <div className="p-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          disabled={createCustomOptionMutation.isPending}
          onClick={() => void createCustomOption()}
        >
          {createCustomOptionMutation.isPending && (
            <Loader2Icon className="size-4 animate-spin" />
          )}
          {!createCustomOptionMutation.isPending && (
            <PlusIcon className="size-4" />
          )}
          <span>Criar "{customLabel}"</span>
        </Button>
      </div>
    );
  }

  if (isMultiple) {
    return (
      <Field
        data-slot="table-row-dropdown-field"
        data-test-id="table-row-dropdown"
        data-invalid={isInvalid}
      >
        <TableRowFieldLabel
          field={field}
          htmlFor={formField.name}
        />

        <Combobox
          data-test-id="table-row-dropdown"
          items={items}
          multiple
          value={selectedOptions}
          onValueChange={handleValueChange}
          itemToStringLabel={(opt: DropdownOption) => opt.label}
          inputValue={inputValue}
          onInputValueChange={setInputValue}
          disabled={disabled}
        >
          <ComboboxChips ref={anchorRef}>
            <ComboboxValue>
              {(values: Array<DropdownOption>): React.ReactNode => {
                let chipsPlaceholder = `Selecione ${resolveFieldLabel(field, 'form').toLowerCase()}`;
                if (values.length > 0) {
                  chipsPlaceholder = '';
                }
                const { visible, hiddenCount } = splitVisibleChips(
                  values,
                  field.visibleChipsLimit,
                );
                return (
                  <>
                    {visible.map((opt) => (
                      <ComboboxChip
                        key={opt.value}
                        aria-label={opt.label}
                        style={getDropdownContrastStyle(opt.color)}
                      >
                        {opt.label}
                      </ComboboxChip>
                    ))}
                    {hiddenCount > 0 && (
                      <span className="text-muted-foreground text-xs">
                        +{hiddenCount}
                      </span>
                    )}
                    <ComboboxChipsInput
                      placeholder={chipsPlaceholder}
                      onKeyDown={handleInputKeyDown}
                    />
                  </>
                );
              }}
            </ComboboxValue>
          </ComboboxChips>

          <ComboboxContent anchor={anchorRef}>
            <ComboboxList>
              {(opt: DropdownOption): React.ReactNode => (
                <ComboboxItem
                  key={opt.value}
                  value={opt}
                  className="mb-1 last:mb-0"
                  style={getDropdownContrastStyle(opt.color)}
                >
                  {opt.label}
                </ComboboxItem>
              )}
            </ComboboxList>
            {createOptionContent}
          </ComboboxContent>
        </Combobox>

        {isInvalid && (
          <FieldError
            id={errorId}
            errors={formField.state.meta.errors}
          />
        )}
      </Field>
    );
  }

  return (
    <Field
      data-slot="table-row-dropdown-field"
      data-test-id="table-row-dropdown"
      data-invalid={isInvalid}
    >
      <TableRowFieldLabel
        field={field}
        htmlFor={formField.name}
      />

      <Combobox
        data-test-id="table-row-dropdown"
        items={items}
        value={selectedOptions[0] ?? null}
        onValueChange={handleValueChange}
        itemToStringLabel={(opt: DropdownOption) => opt.label}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        disabled={disabled}
      >
        <ComboboxInput
          placeholder={
            selectedOptions[0]?.label ||
            `Selecione ${resolveFieldLabel(field, 'form').toLowerCase()}`
          }
          showClear={selectedOptions.length > 0}
          onKeyDown={handleInputKeyDown}
        />
        <ComboboxContent>
          <ComboboxList>
            {(opt: DropdownOption): React.ReactNode => (
              <ComboboxItem
                key={opt.value}
                value={opt}
                className="mb-1 last:mb-0"
                style={getDropdownContrastStyle(opt.color)}
              >
                {opt.label}
              </ComboboxItem>
            )}
          </ComboboxList>
          {createOptionContent}
        </ComboboxContent>
      </Combobox>

      {isInvalid && (
        <FieldError
          id={errorId}
          errors={formField.state.meta.errors}
        />
      )}
    </Field>
  );
}
