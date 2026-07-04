/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useNavigate, useSearch } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { TextIcon, XIcon } from 'lucide-react';
import React from 'react';

import { ComboboxLoadMore } from '@/components/common/combobox-load-more';
import type { DatepickerValue } from '@/components/common/datepicker';
import { RangeDatepicker } from '@/components/common/datepicker';
import { getDropdownContrastStyle } from '@/components/common/dynamic-table/table-cells/utils';
import { UserMultiSelect } from '@/components/common/selectors/user-multi-select';
import type { TreeNode } from '@/components/common/tree-editor/tree-list';
import { TreeList } from '@/components/common/tree-editor/tree-list';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useRelationshipRowsReadPaginatedInfinite } from '@/hooks/tanstack-query/use-relationship-rows-read-paginated-infinite';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { ICategory, IFilterField, IRow } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';
import { cn } from '@/lib/utils';

export function convertCategoriesToTreeNodes(
  categories: Array<ICategory>,
): Array<TreeNode> {
  return categories.map((cat) => {
    let children: Array<TreeNode> = [];
    if (cat.children.length > 0) {
      children = convertCategoriesToTreeNodes(cat.children);
    }
    return {
      id: cat.id,
      label: cat.label,
      children,
    };
  });
}

export function findCategoryLabel(
  categoryId: string,
  categories: Array<ICategory>,
): string | null {
  for (const cat of categories) {
    if (cat.id === categoryId) return cat.label;
    if (cat.children.length > 0) {
      const found = findCategoryLabel(categoryId, cat.children);
      if (found) return found;
    }
  }
  return null;
}

// Valores de filtro são dinâmicos por slug de campo (shape só conhecido em
// runtime) — `any` isolado neste alias, único ponto sancionado no arquivo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FilterValues = Record<string, any>;

interface UseFilterStateReturn {
  filterValues: FilterValues;
  setFilterValues: React.Dispatch<React.SetStateAction<FilterValues>>;
  handleSubmit: () => void;
  handleClear: () => void;
  removeFilter: (key: string) => void;
  handleMultiValueChange: (field: IFilterField, value: Array<string>) => void;
  activeFiltersCount: number;
}

export function useFilterState(
  fields: Array<IFilterField>,
  options?: { closeOnSubmit?: boolean; onClose?: () => void },
): UseFilterStateReturn {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });

  const [filterValues, setFilterValues] = React.useState<FilterValues>(
    {},
  );

  const fieldsKey = fields.map((f) => f.slug).join(',');

  React.useEffect(() => {
    const initialValues: Record<string, unknown> = {};
    for (const field of fields) {
      const fieldValue = search[field.slug];
      if (typeof fieldValue === 'string') {
        if (
          field.type === E_FIELD_TYPE.DROPDOWN ||
          field.type === E_FIELD_TYPE.CATEGORY ||
          field.type === E_FIELD_TYPE.USER ||
          field.type === E_FIELD_TYPE.CREATOR ||
          field.type === E_FIELD_TYPE.UPDATER ||
          field.type === E_FIELD_TYPE.RELATIONSHIP
        ) {
          initialValues[field.slug] = fieldValue.split(',');
        } else {
          initialValues[field.slug] = fieldValue;
        }
      }

      if (
        field.type === E_FIELD_TYPE.DATE ||
        field.type === E_FIELD_TYPE.CREATED_AT ||
        field.type === E_FIELD_TYPE.UPDATED_AT
      ) {
        const initialDateStr = search[`${field.slug}-initial`];
        const finalDateStr = search[`${field.slug}-final`];

        if (
          typeof initialDateStr === 'string' ||
          typeof finalDateStr === 'string'
        ) {
          let startDate: Date | null = null;
          if (typeof initialDateStr === 'string') {
            startDate = parseISO(initialDateStr);
          }
          let endDate: Date | null = null;
          if (typeof finalDateStr === 'string') {
            endDate = parseISO(finalDateStr);
          }
          initialValues[field.slug] = { startDate, endDate };
        }
      }
    }
    setFilterValues(initialValues);
  }, [fieldsKey, search]);

  const handleSubmit = (): void => {
    const filters: Record<string, string | undefined> = {};

    // Initialize all field keys as undefined so cleared fields are removed from URL
    for (const field of fields) {
      filters[field.slug] = undefined;
      if (
        field.type === E_FIELD_TYPE.DATE ||
        field.type === E_FIELD_TYPE.CREATED_AT ||
        field.type === E_FIELD_TYPE.UPDATED_AT
      ) {
        filters[`${field.slug}-initial`] = undefined;
        filters[`${field.slug}-final`] = undefined;
      }
    }

    for (const field of fields) {
      const value = filterValues[field.slug];

      if (
        [
          E_FIELD_TYPE.TEXT_SHORT.toString(),
          E_FIELD_TYPE.TEXT_LONG.toString(),
        ].includes(field.type) &&
        value
      ) {
        filters[field.slug] = String(value);
      }

      if (field.type === E_FIELD_TYPE.DROPDOWN && Array.isArray(value)) {
        const values = value.filter(Boolean);
        if (values.length > 0) {
          filters[field.slug] = values.join(',');
        }
      }

      if (field.type === E_FIELD_TYPE.CATEGORY && Array.isArray(value)) {
        if (value.length > 0) {
          filters[field.slug] = value.join(',');
        }
      }

      if (
        (field.type === E_FIELD_TYPE.USER ||
          field.type === E_FIELD_TYPE.CREATOR ||
          field.type === E_FIELD_TYPE.UPDATER ||
          field.type === E_FIELD_TYPE.RELATIONSHIP) &&
        Array.isArray(value)
      ) {
        const values = value.filter(Boolean);
        if (values.length > 0) {
          filters[field.slug] = values.join(',');
        }
      }

      if (
        field.type === E_FIELD_TYPE.DATE ||
        field.type === E_FIELD_TYPE.CREATED_AT ||
        field.type === E_FIELD_TYPE.UPDATED_AT
      ) {
        const dateValue: DatepickerValue | null = filterValues[field.slug];

        if (dateValue?.startDate) {
          filters[`${field.slug}-initial`] = format(
            dateValue.startDate,
            'yyyy-MM-dd',
          );
        }
        if (dateValue?.endDate) {
          filters[`${field.slug}-final`] = format(
            dateValue.endDate,
            'yyyy-MM-dd',
          );
        }
      }
    }

    navigate({
      // @ts-ignore
      search: (state) => ({
        ...state,
        ...filters,
        page: 1,
      }),
    });

    if (options?.closeOnSubmit) {
      options.onClose?.();
    }
  };

  const handleClear = (): void => {
    navigate({
      // @ts-ignore
      search: (state) => ({
        page: 1,
        perPage: state.perPage,
        trashed: state.trashed,
      }),
    });
    setFilterValues({});
    if (options?.closeOnSubmit) {
      options.onClose?.();
    }
  };

  const removeFilter = (key: string): void => {
    navigate({
      // @ts-ignore
      search: (state) => ({
        ...state,
        [key]: undefined,
        page: 1,
      }),
    });
    setFilterValues((prev) => ({ ...prev, [key]: undefined }));
  };

  // Dropdown/category aceitam multi-valor e sao persistidos como CSV na URL.
  // Ao remover um chip, precisamos refletir isso imediatamente na listagem;
  // adicoes continuam aguardando o botao Pesquisar.
  const handleMultiValueChange = (
    field: IFilterField,
    value: Array<string>,
  ): void => {
    const applied = search[field.slug];
    let appliedTokens: Array<string> = [];
    if (typeof applied === 'string' && applied.length > 0) {
      appliedTokens = applied.split(',');
    }
    const isRemoval = value.length < appliedTokens.length;

    setFilterValues((prev) => ({ ...prev, [field.slug]: value }));

    if (!isRemoval) return;

    navigate({
      // @ts-ignore
      search: (state) => {
        let slugValue: string | undefined;
        if (value.length > 0) slugValue = value.join(',');
        return { ...state, [field.slug]: slugValue, page: 1 };
      },
    });
  };

  const activeFiltersCount =
    fields.filter((f) => {
      return (
        search[f.slug] ||
        search[`${f.slug}-initial`] ||
        search[`${f.slug}-final`]
      );
    }).length + Number(Boolean(search.search));

  return {
    filterValues,
    setFilterValues,
    handleSubmit,
    handleClear,
    removeFilter,
    handleMultiValueChange,
    activeFiltersCount,
  };
}

export function getActiveFiltersCount(
  fields: Array<IFilterField>,
  search: Record<string, unknown>,
): number {
  const fieldsCount = fields.filter((f) => {
    return (
      search[f.slug] || search[`${f.slug}-initial`] || search[`${f.slug}-final`]
    );
  }).length;
  return fieldsCount + Number(Boolean(search.search));
}

interface FilterFieldsFormProps {
  fields: Array<IFilterField>;
  filterValues: FilterValues;
  setFilterValues: React.Dispatch<React.SetStateAction<FilterValues>>;
  removeFilter: (key: string) => void;
  handleMultiValueChange: (field: IFilterField, value: Array<string>) => void;
  search: Record<string, unknown>;
}

export function FilterFieldsForm({
  fields,
  filterValues,
  setFilterValues,
  removeFilter,
  handleMultiValueChange,
  search,
}: FilterFieldsFormProps): React.JSX.Element {
  return (
    <section
      data-slot="filter-fields"
      data-test-id="filter-fields"
      className="flex flex-col gap-4 w-full"
    >
      {fields.map((field) => (
        <div
          key={field.slug}
          data-test-id={`filter-${field.slug}`}
          className="flex w-full flex-col relative"
        >
          {field.type === E_FIELD_TYPE.TEXT_SHORT && (
            <FilterTextShort
              field={field}
              value={filterValues[field.slug] ?? ''}
              onChange={(value) =>
                setFilterValues((prev) => ({
                  ...prev,
                  [field.slug]: value,
                }))
              }
              onRemove={() => removeFilter(field.slug)}
              hasValue={Boolean(search[field.slug])}
            />
          )}

          {field.type === E_FIELD_TYPE.TEXT_LONG && (
            <FilterTextShort
              field={field}
              value={filterValues[field.slug] ?? ''}
              onChange={(value) =>
                setFilterValues((prev) => ({
                  ...prev,
                  [field.slug]: value,
                }))
              }
              onRemove={() => removeFilter(field.slug)}
              hasValue={Boolean(search[field.slug])}
            />
          )}

          {field.type === E_FIELD_TYPE.DROPDOWN && (
            <FilterDropdown
              field={field}
              value={filterValues[field.slug] ?? []}
              onChange={(value) => handleMultiValueChange(field, value)}
            />
          )}

          {field.type === E_FIELD_TYPE.DATE && (
            <FilterDate
              field={field}
              value={filterValues[field.slug] ?? null}
              onChange={(value) =>
                setFilterValues((prev) => ({
                  ...prev,
                  [field.slug]: value,
                }))
              }
            />
          )}

          {(field.type === E_FIELD_TYPE.CREATED_AT ||
            field.type === E_FIELD_TYPE.UPDATED_AT) && (
            <FilterDate
              field={field}
              value={filterValues[field.slug] ?? null}
              onChange={(value) =>
                setFilterValues((prev) => ({
                  ...prev,
                  [field.slug]: value,
                }))
              }
            />
          )}

          {(field.type === E_FIELD_TYPE.USER ||
            field.type === E_FIELD_TYPE.CREATOR ||
            field.type === E_FIELD_TYPE.UPDATER) && (
            <FilterUser
              field={field}
              value={filterValues[field.slug] ?? []}
              onChange={(value) => handleMultiValueChange(field, value)}
            />
          )}

          {field.type === E_FIELD_TYPE.RELATIONSHIP && (
            <FilterRelationship
              field={field}
              value={filterValues[field.slug] ?? []}
              onChange={(value) => handleMultiValueChange(field, value)}
            />
          )}

          {field.type === E_FIELD_TYPE.CATEGORY && (
            <FilterCategory
              field={field}
              value={filterValues[field.slug] ?? []}
              onChange={(value) => handleMultiValueChange(field, value)}
            />
          )}
        </div>
      ))}
    </section>
  );
}

export function FilterTextShort({
  field,
  value,
  onChange,
  onRemove,
  hasValue,
}: {
  field: IFilterField;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  hasValue: boolean;
}): React.JSX.Element {
  return (
    <Field data-slot="filter-text-short">
      <FieldLabel>{resolveFieldLabel(field, 'filter')}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          data-test-id={`filter-input-${field.slug}`}
          type="text"
          placeholder={`Filtrar por ${resolveFieldLabel(field, 'filter').toLowerCase()}`}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
        />
        <InputGroupAddon align="inline-end">
          {hasValue && (
            <InputGroupButton
              data-test-id={`filter-clear-${field.slug}`}
              onClick={onRemove}
              variant="ghost"
              size="icon-xs"
              aria-label={`Limpar ${resolveFieldLabel(field, 'filter')}`}
            >
              <XIcon className="size-4" />
            </InputGroupButton>
          )}
          {!hasValue && <TextIcon className="size-4" />}
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}

interface DropdownOption {
  value: string;
  label: string;
  color?: string | null;
}

export function FilterDropdown({
  field,
  value,
  onChange,
}: {
  field: IFilterField;
  value: Array<string>;
  onChange: (value: Array<string>) => void;
}): React.JSX.Element {
  const anchorRef = useComboboxAnchor();
  const options: Array<DropdownOption> = (field.dropdown ?? []).map((d) => ({
    value: d.id,
    label: d.label,
    color: d.color,
  }));

  const selectedOptions = React.useMemo(() => {
    return options.filter((opt) => value.includes(opt.value));
  }, [options, value]);

  let singleValue = '';
  if (value.length > 0) {
    singleValue = value[0];
  }

  if (field.multiple) {
    return (
      <Field>
        <FieldLabel>{resolveFieldLabel(field, 'filter')}</FieldLabel>
        <Combobox
          items={options}
          multiple
          value={selectedOptions}
          onValueChange={(newValue: Array<DropdownOption>) => {
            onChange(newValue.map((v) => v.value));
          }}
          itemToStringLabel={(opt: DropdownOption) => opt.label}
        >
          <ComboboxChips
            ref={anchorRef}
            className="w-full"
          >
            <ComboboxValue>
              {(values: Array<DropdownOption>): React.ReactNode => {
                let chipsPlaceholder = `Filtrar por ${resolveFieldLabel(field, 'filter').toLowerCase()}`;
                if (values.length > 0) {
                  chipsPlaceholder = '';
                }
                return (
                  <React.Fragment>
                    {values.map((opt) => (
                      <ComboboxChip
                        key={opt.value}
                        aria-label={opt.label}
                        style={getDropdownContrastStyle(opt.color)}
                      >
                        {opt.label}
                      </ComboboxChip>
                    ))}
                    <ComboboxChipsInput placeholder={chipsPlaceholder} />
                  </React.Fragment>
                );
              }}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchorRef}>
            <ComboboxEmpty>Nenhum resultado encontrado</ComboboxEmpty>
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
          </ComboboxContent>
        </Combobox>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel>{resolveFieldLabel(field, 'filter')}</FieldLabel>
      <Select
        data-test-id={`filter-select-${field.slug}`}
        value={singleValue}
        onValueChange={(v) => {
          if (v) {
            onChange([v]);
          } else {
            onChange([]);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={`Filtrar por ${resolveFieldLabel(field, 'filter').toLowerCase()}`}
          />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="mb-1 last:mb-0"
              style={getDropdownContrastStyle(option.color)}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function FilterDate({
  field,
  value,
  onChange,
}: {
  field: IFilterField;
  value: DatepickerValue | null;
  onChange: (value: DatepickerValue | null) => void;
}): React.JSX.Element {
  return (
    <Field data-slot="filter-date">
      <FieldLabel>{resolveFieldLabel(field, 'filter')}</FieldLabel>
      <RangeDatepicker
        data-test-id={`filter-date-${field.slug}`}
        value={value}
        onChange={onChange}
        dualCalendar={false}
        placeholder="Selecione o período"
      />
    </Field>
  );
}

export function FilterCategory({
  field,
  value,
  onChange,
}: {
  field: IFilterField;
  value: Array<string>;
  onChange: (value: Array<string>) => void;
}): React.JSX.Element {
  const categories = field.category ?? [];
  const treeData = convertCategoriesToTreeNodes(categories);

  const selectedLabel = React.useMemo(() => {
    if (value.length === 0) return null;
    const labels = value
      .map((id) => findCategoryLabel(id, categories))
      .filter(Boolean);
    if (labels.length > 0) {
      return labels.join(', ');
    }
    return null;
  }, [value, categories]);

  return (
    <Field>
      <FieldLabel>{resolveFieldLabel(field, 'filter')}</FieldLabel>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            data-test-id={`filter-category-${field.slug}`}
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !selectedLabel && 'text-muted-foreground',
            )}
          >
            {selectedLabel ||
              `Filtrar por ${resolveFieldLabel(field, 'filter').toLowerCase()}`}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-2"
          align="start"
        >
          <TreeList
            data={treeData}
            selectedIds={value}
            onSelectionChange={onChange}
            multiSelect={field.multiple}
            showCheckboxes={field.multiple}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

export function FilterUser({
  field,
  value,
  onChange,
}: {
  field: IFilterField;
  value: Array<string>;
  onChange: (value: Array<string>) => void;
}): React.JSX.Element {
  return (
    <Field data-slot="filter-user">
      <FieldLabel>{resolveFieldLabel(field, 'filter')}</FieldLabel>
      <UserMultiSelect
        value={value}
        onValueChange={onChange}
        placeholder={`Filtrar por ${resolveFieldLabel(field, 'filter').toLowerCase()}`}
      />
    </Field>
  );
}

export function FilterRelationship({
  field,
  value,
  onChange,
}: {
  field: IFilterField;
  value: Array<string>;
  onChange: (value: Array<string>) => void;
}): React.JSX.Element {
  const anchorRef = useComboboxAnchor();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [selectedCache, setSelectedCache] = React.useState<Map<string, IRow>>(
    () => new Map(),
  );

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return (): void => clearTimeout(timer);
  }, [searchQuery]);

  const relConfig = field.relationship;
  const labelSlug = relConfig?.field?.slug;

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useRelationshipRowsReadPaginatedInfinite({
      tableSlug: relConfig?.table?.slug ?? '',
      fieldSlug: field.slug,
      search: debouncedQuery,
      perPage: 10,
    });

  const allItems: Array<IRow> = React.useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data?.pages],
  );

  React.useEffect(() => {
    if (!allItems.length) return;
    setSelectedCache((prev) => {
      const next = new Map(prev);
      for (const row of allItems) {
        next.set(row._id, row);
      }
      return next;
    });
  }, [allItems]);

  const rowLabel = React.useCallback(
    (row: IRow): string => {
      if (labelSlug) {
        return String(row[labelSlug] ?? row._id);
      }
      return row._id;
    },
    [labelSlug],
  );

  const selectedItems = React.useMemo<Array<IRow>>(() => {
    return value
      .map((id) => {
        const cached = selectedCache.get(id);
        if (cached) return cached;
        const fromList = allItems.find((row) => row._id === id);
        if (fromList) return fromList;
        // placeholder mínimo para id ainda não resolvido no cache/lista;
        // IRow exige `creator` e demais campos, por isso o cast e inevitavel aqui.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return { _id: id } as IRow;
      })
      .filter((row): row is IRow => row !== null);
  }, [value, selectedCache, allItems]);

  const items = React.useMemo(() => {
    const idsInList = new Set(allItems.map((row) => row._id));
    const extras = selectedItems.filter((row) => !idsInList.has(row._id));
    if (extras.length) {
      return [...allItems, ...extras];
    }
    return allItems;
  }, [allItems, selectedItems]);

  if (!relConfig || !relConfig.field || !relConfig.table) {
    return (
      <Field data-slot="filter-relationship">
        <FieldLabel>{resolveFieldLabel(field, 'filter')}</FieldLabel>
        <p className="text-muted-foreground text-sm">
          Relacionamento não configurado
        </p>
      </Field>
    );
  }

  const handleChange = (selected: Array<IRow>): void => {
    if (selected.length > 0) {
      setSelectedCache((prev) => {
        const next = new Map(prev);
        for (const row of selected) {
          next.set(row._id, row);
        }
        return next;
      });
    }
    onChange(selected.map((row) => row._id));
    if (selected.length > value.length && searchQuery.trim().length > 0) {
      setSearchQuery('');
    }
  };

  return (
    <Field data-slot="filter-relationship">
      <FieldLabel>{resolveFieldLabel(field, 'filter')}</FieldLabel>
      <div className="relative">
        <Combobox
          data-test-id={`filter-relationship-${field.slug}`}
          items={items}
          multiple
          value={selectedItems}
          onValueChange={handleChange}
          inputValue={searchQuery}
          onInputValueChange={setSearchQuery}
          itemToStringLabel={rowLabel}
        >
          <ComboboxChips
            ref={anchorRef}
            className="w-full"
          >
            <ComboboxValue>
              {(values: Array<IRow>): React.ReactNode => {
                let chipsPlaceholder = `Filtrar por ${resolveFieldLabel(field, 'filter').toLowerCase()}`;
                if (values.length > 0) {
                  chipsPlaceholder = '';
                }
                return (
                  <React.Fragment>
                    {values.slice(0, 2).map((row) => (
                      <ComboboxChip
                        key={row._id}
                        aria-label={rowLabel(row)}
                      >
                        {rowLabel(row)}
                      </ComboboxChip>
                    ))}
                    {values.length > 2 && (
                      <span className="text-muted-foreground text-xs">
                        +{values.length - 2}
                      </span>
                    )}
                    <ComboboxChipsInput placeholder={chipsPlaceholder} />
                  </React.Fragment>
                );
              }}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchorRef}>
            <ComboboxEmpty>Nenhum resultado encontrado</ComboboxEmpty>
            {isLoading && (
              <div className="flex items-center justify-center p-3">
                <Spinner className="opacity-50" />
              </div>
            )}
            {!isLoading && (
              <React.Fragment>
                <ComboboxList>
                  {(row: IRow): React.ReactNode => (
                    <ComboboxItem
                      key={row._id}
                      value={row}
                    >
                      {rowLabel(row)}
                    </ComboboxItem>
                  )}
                </ComboboxList>
                <ComboboxLoadMore
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  onLoadMore={() => fetchNextPage()}
                />
              </React.Fragment>
            )}
          </ComboboxContent>
        </Combobox>
      </div>
    </Field>
  );
}
