import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { GitBranchIcon, PlusIcon, SettingsIcon, TrashIcon } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { cascadeDropdownQueryKeys } from '@/hooks/tanstack-query/use-cascade-dropdown';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import { API } from '@/lib/api';
import { E_FIELD_TYPE } from '@/lib/constant';
import { handleApiError } from '@/lib/handle-api-error';
import type { ICategory, IField, ITable } from '@/lib/interfaces';

type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'date_between';

type CascadeFilter = {
  id: string;
  fieldId: string;
  fieldSlug: string;
  fieldType: string;
  operator: FilterOperator;
  value: string | null;
  values: Array<string>;
  dateStart: string | null;
  dateEnd: string | null;
};

type CascadeConfig = {
  _id?: string;
  targetTableSlug: string;
  targetFieldId: string;
  targetFieldSlug: string;
  sourceTableId: string;
  sourceTableSlug: string;
  parentFieldId: string;
  parentFieldSlug: string;
  childFieldId: string;
  childFieldSlug: string;
  enabled: boolean;
  parentWidth: number;
  childWidth: number;
  filters: Array<CascadeFilter>;
};

type CascadeDropdownPluginProps = {
  table?: ITable;
  tableSlug?: string;
  targetField?: IField;
  targetFieldId?: string;
  targetFieldSlug?: string;
  sourceTableSlug?: string;
  relationshipFieldSlug?: string;
  disabled?: boolean;
};

const EMPTY_VALUE = '__empty__';

const FILTERABLE_TYPES = new Set<string>([
  E_FIELD_TYPE.TEXT_SHORT,
  E_FIELD_TYPE.TEXT_LONG,
  E_FIELD_TYPE.DROPDOWN,
  E_FIELD_TYPE.CATEGORY,
  E_FIELD_TYPE.DATE,
]);

function isIgnoredConfigError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.response?.status === 404 || error.response?.status === 403)
  );
}

function newFilter(): CascadeFilter {
  return {
    id: crypto.randomUUID(),
    fieldId: '',
    fieldSlug: '',
    fieldType: '',
    operator: 'equals',
    value: null,
    values: [],
    dateStart: null,
    dateEnd: null,
  };
}

function flattenCategories(categories: Array<ICategory>): Array<{
  value: string;
  label: string;
}> {
  const items: Array<{ value: string; label: string }> = [];
  const walk = (nodes: Array<ICategory>, prefix = ''): void => {
    for (const node of nodes) {
      let label = node.label;
      if (prefix) label = `${prefix} / ${node.label}`;
      items.push({ value: node.id, label });
      walk(node.children ?? [], label);
    }
  };
  walk(categories);
  return items;
}

function getOperators(fieldType: string): Array<{
  value: FilterOperator;
  label: string;
}> {
  if (
    fieldType === E_FIELD_TYPE.TEXT_SHORT ||
    fieldType === E_FIELD_TYPE.TEXT_LONG
  ) {
    return [
      { value: 'contains', label: 'Contém' },
      { value: 'equals', label: 'Igual' },
      { value: 'not_equals', label: 'Diferente' },
      { value: 'is_empty', label: 'Vazio' },
      { value: 'is_not_empty', label: 'Não vazio' },
    ];
  }

  if (fieldType === E_FIELD_TYPE.DATE) {
    return [
      { value: 'date_between', label: 'Entre datas' },
      { value: 'is_empty', label: 'Vazio' },
      { value: 'is_not_empty', label: 'Não vazio' },
    ];
  }

  return [
    { value: 'equals', label: 'Igual' },
    { value: 'not_equals', label: 'Diferente' },
    { value: 'is_empty', label: 'Vazio' },
    { value: 'is_not_empty', label: 'Não vazio' },
  ];
}

function getFieldOptions(
  field: IField,
): Array<{ value: string; label: string }> {
  if (field.type === E_FIELD_TYPE.DROPDOWN) {
    return (field.dropdown ?? []).map((item) => ({
      value: item.id,
      label: item.label,
    }));
  }
  if (field.type === E_FIELD_TYPE.CATEGORY) {
    return flattenCategories(field.category ?? []);
  }
  return [];
}

function getInitialConfig(params: {
  tableSlug: string;
  targetField: IField;
  sourceTable: ITable;
  relationshipField?: IField;
  parentField?: IField;
  filterField?: IField;
}): CascadeConfig {
  const {
    tableSlug,
    targetField,
    sourceTable,
    relationshipField,
    parentField,
    filterField,
  } = params;

  return {
    targetTableSlug: tableSlug,
    targetFieldId: targetField._id,
    targetFieldSlug: targetField.slug,
    sourceTableId: sourceTable._id,
    sourceTableSlug: sourceTable.slug,
    parentFieldId: parentField?._id ?? '',
    parentFieldSlug: parentField?.slug ?? '',
    childFieldId: filterField?._id ?? relationshipField?._id ?? '',
    childFieldSlug: filterField?.slug ?? relationshipField?.slug ?? '',
    enabled: false,
    parentWidth: 30,
    childWidth: 70,
    filters: [],
  };
}

function normalizeConfig(config: CascadeConfig): CascadeConfig {
  let filters: CascadeConfig['filters'] = [];
  if (Array.isArray(config.filters)) filters = config.filters;
  return {
    ...config,
    parentWidth: config.parentWidth ?? 30,
    childWidth: config.childWidth ?? 70,
    filters,
  };
}

function normalizeWidth(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(100, Math.max(1, Math.round(value)));
}

function getRelationshipTableSlug(field?: IField): string {
  return field?.relationship?.table?.slug ?? '';
}

export default function CascadeDropdownPlugin({
  table,
  tableSlug = '',
  targetField,
  targetFieldId = targetField?._id ?? '',
  sourceTableSlug = '',
  relationshipFieldSlug = '',
  disabled = false,
}: CascadeDropdownPluginProps): React.JSX.Element | null {
  const queryClient = useQueryClient();
  const sourceTable = useReadTable({ slug: sourceTableSlug });
  const { closeRef, close } = useDismissableDialog();
  const initializedDraftKeyRef = React.useRef('');

  const configQuery = useQuery({
    queryKey: cascadeDropdownQueryKeys.config(tableSlug, targetFieldId),
    enabled:
      Boolean(tableSlug) &&
      Boolean(targetFieldId) &&
      Boolean(sourceTableSlug) &&
      Boolean(relationshipFieldSlug),
    queryFn: async () => {
      try {
        const response = await API.get<CascadeConfig | null>(
          `/plugins/cascade-dropdown/tables/${tableSlug}/fields/${targetFieldId}/config`,
        );
        return response.data;
      } catch (error) {
        if (isIgnoredConfigError(error)) return null;
        throw error;
      }
    },
    retry: false,
    throwOnError: false,
  });

  const sourceFields = React.useMemo(() => {
    return (sourceTable.data?.fields ?? []).filter(
      (field) =>
        !field.trashed &&
        !field.native &&
        field.type !== E_FIELD_TYPE.FIELD_GROUP,
    );
  }, [sourceTable.data?.fields]);

  const availableParentFields = React.useMemo(() => {
    return (table?.fields ?? []).filter(
      (field) =>
        !field.trashed &&
        !field.native &&
        field._id !== targetFieldId &&
        field.type === E_FIELD_TYPE.RELATIONSHIP,
    );
  }, [table?.fields, targetFieldId]);

  const availableCascadeFilterFields = React.useMemo(() => {
    return sourceFields.filter(
      (field) => field.type === E_FIELD_TYPE.RELATIONSHIP,
    );
  }, [sourceFields]);

  const cascadeFilterFields = React.useMemo(() => {
    return availableCascadeFilterFields.filter((filterField) => {
      const filterTableSlug = getRelationshipTableSlug(filterField);
      return availableParentFields.some(
        (parentField) =>
          getRelationshipTableSlug(parentField) === filterTableSlug,
      );
    });
  }, [availableCascadeFilterFields, availableParentFields]);

  const [draft, setDraft] = React.useState<CascadeConfig | null>(null);

  const parentFields = React.useMemo(() => {
    if (cascadeFilterFields.length === 0) return [];
    const selectedFilter = cascadeFilterFields.find(
      (field) => field._id === draft?.childFieldId,
    );
    let filterSource = cascadeFilterFields;
    if (selectedFilter) filterSource = [selectedFilter];
    const validFilterTableSlugs = new Set(
      filterSource
        .map((field) => getRelationshipTableSlug(field))
        .filter(Boolean),
    );
    return availableParentFields.filter((parentField) =>
      validFilterTableSlugs.has(getRelationshipTableSlug(parentField)),
    );
  }, [availableParentFields, cascadeFilterFields, draft?.childFieldId]);

  const filterFields = React.useMemo(() => {
    return sourceFields.filter((field) => FILTERABLE_TYPES.has(field.type));
  }, [sourceFields]);

  const relationshipField = React.useMemo(() => {
    return sourceFields.find((field) => field.slug === relationshipFieldSlug);
  }, [relationshipFieldSlug, sourceFields]);

  React.useEffect(() => {
    if (!targetField || !sourceTable.data) return;
    let configSignature = 'new';
    if (configQuery.data) {
      configSignature = [
        configQuery.data._id ?? '',
        configQuery.data.parentFieldId ?? '',
        configQuery.data.parentFieldSlug ?? '',
        configQuery.data.childFieldId ?? '',
        configQuery.data.childFieldSlug ?? '',
        String(configQuery.data.enabled),
      ].join('|');
    }
    const draftKey = [
      tableSlug,
      targetField._id,
      sourceTable.data._id,
      configSignature,
    ].join(':');
    if (initializedDraftKeyRef.current === draftKey) return;
    initializedDraftKeyRef.current = draftKey;

    let defaultFilterField: (typeof cascadeFilterFields)[number] | undefined;
    if (cascadeFilterFields.length === 1) {
      defaultFilterField = cascadeFilterFields[0];
    }
    let filterForDefault = defaultFilterField;
    if (configQuery.data && normalizeConfig(configQuery.data).childFieldId) {
      filterForDefault = cascadeFilterFields.find(
        (field) =>
          field._id === normalizeConfig(configQuery.data!).childFieldId,
      );
    }
    let parentFieldsForDefault = parentFields;
    if (filterForDefault) {
      const filter = filterForDefault;
      parentFieldsForDefault = availableParentFields.filter(
        (field) =>
          getRelationshipTableSlug(field) === getRelationshipTableSlug(filter),
      );
    }
    let defaultParentField: (typeof parentFieldsForDefault)[number] | undefined;
    if (parentFieldsForDefault.length === 1) {
      defaultParentField = parentFieldsForDefault[0];
    }
    let normalized: CascadeConfig | null = null;
    if (configQuery.data) normalized = normalizeConfig(configQuery.data);
    const next =
      normalized ??
      getInitialConfig({
        tableSlug,
        targetField,
        sourceTable: sourceTable.data,
        relationshipField,
        parentField: defaultParentField,
        filterField: defaultFilterField,
      });
    setDraft(next);
  }, [
    availableParentFields,
    cascadeFilterFields,
    configQuery.data,
    parentFields,
    relationshipField,
    sourceTable.data,
    tableSlug,
    targetField,
  ]);

  const saveConfig = useMutation({
    mutationFn: async (config: CascadeConfig) => {
      const response = await API.put<CascadeConfig>(
        `/plugins/cascade-dropdown/tables/${tableSlug}/fields/${targetFieldId}/config`,
        {
          sourceTableId: config.sourceTableId,
          sourceTableSlug: config.sourceTableSlug,
          parentFieldId: config.parentFieldId,
          parentFieldSlug: config.parentFieldSlug,
          childFieldId: config.childFieldId,
          childFieldSlug: config.childFieldSlug,
          enabled: config.enabled,
          parentWidth: normalizeWidth(config.parentWidth),
          childWidth: normalizeWidth(config.childWidth),
          filters: config.filters ?? [],
        },
      );
      return response.data;
    },
    onSuccess(data) {
      const next = normalizeConfig(data);
      setDraft(next);
      close();
      queryClient.setQueryData(
        cascadeDropdownQueryKeys.config(tableSlug, targetFieldId),
        next,
      );
      queryClient.invalidateQueries({
        queryKey: cascadeDropdownQueryKeys.all,
      });
      toast.success('Configuração salva', {
        description: 'O dropdown em cascata foi configurado com sucesso',
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao salvar configuração',
      });
    },
  });

  if (
    !targetField ||
    !sourceTableSlug ||
    targetField.type !== E_FIELD_TYPE.RELATIONSHIP
  ) {
    return null;
  }

  if (sourceTable.status === 'pending' || configQuery.status === 'pending') {
    return (
      <div className="rounded-md border p-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        <span>Carregando configuração do dropdown em cascata...</span>
      </div>
    );
  }

  if (!sourceTable.data || !draft) {
    return null;
  }

  if (cascadeFilterFields.length === 0 || parentFields.length === 0) {
    return null;
  }

  const setParentField = (fieldSlug: string): void => {
    const field = parentFields.find((item) => item.slug === fieldSlug);
    setDraft((current) => {
      if (!current || !field) return current;
      return {
        ...current,
        parentFieldId: field._id,
        parentFieldSlug: field.slug,
        ...(cascadeFilterFields.length === 1 && {
          childFieldId: cascadeFilterFields[0]._id,
          childFieldSlug: cascadeFilterFields[0].slug,
        }),
      };
    });
  };

  const setFilterField = (fieldSlug: string): void => {
    const field = cascadeFilterFields.find((item) => item.slug === fieldSlug);
    setDraft((current) => {
      if (!current || !field) return current;
      const filterTableSlug = getRelationshipTableSlug(field);
      const currentParent = parentFields.find(
        (item) => item._id === current.parentFieldId,
      );
      const keepParent =
        currentParent &&
        getRelationshipTableSlug(currentParent) === filterTableSlug;
      let parentFieldId = '';
      let parentFieldSlug = '';
      if (keepParent) {
        parentFieldId = current.parentFieldId;
        parentFieldSlug = current.parentFieldSlug;
      }
      return {
        ...current,
        childFieldId: field._id,
        childFieldSlug: field.slug,
        parentFieldId,
        parentFieldSlug,
      };
    });
  };

  const updateFilter = (
    filterId: string,
    updater: (filter: CascadeFilter) => CascadeFilter,
  ): void => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        filters: (current.filters ?? []).map((filter) => {
          if (filter.id === filterId) return updater(filter);
          return filter;
        }),
      };
    });
  };

  const selectedParentField = availableParentFields.find(
    (field) => field._id === draft.parentFieldId,
  );
  let compatibleFilterFieldsForParent = cascadeFilterFields;
  if (selectedParentField) {
    const parent = selectedParentField;
    compatibleFilterFieldsForParent = cascadeFilterFields.filter(
      (field) =>
        getRelationshipTableSlug(field) === getRelationshipTableSlug(parent),
    );
  }
  const selectedFilterField = compatibleFilterFieldsForParent.find(
    (field) => field._id === draft.childFieldId,
  );
  let firstCompatibleFilterField:
    | (typeof compatibleFilterFieldsForParent)[number]
    | undefined;
  if (compatibleFilterFieldsForParent.length === 1) {
    firstCompatibleFilterField = compatibleFilterFieldsForParent[0];
  }
  const effectiveFilterField =
    selectedFilterField ?? firstCompatibleFilterField;
  const effectiveSourceTableId =
    draft.sourceTableId || sourceTable.data?._id || '';
  const effectiveSourceTableSlug =
    draft.sourceTableSlug || sourceTable.data?.slug || sourceTableSlug;
  const effectiveParentFieldId = selectedParentField?._id || '';
  const effectiveParentFieldSlug = selectedParentField?.slug || '';
  const effectiveChildFieldId = effectiveFilterField?._id || '';
  const effectiveChildFieldSlug = effectiveFilterField?.slug || '';

  const canSave =
    !disabled &&
    Boolean(effectiveSourceTableId) &&
    Boolean(effectiveSourceTableSlug) &&
    Boolean(effectiveParentFieldId) &&
    Boolean(effectiveParentFieldSlug) &&
    Boolean(effectiveChildFieldId) &&
    Boolean(effectiveChildFieldSlug) &&
    saveConfig.status !== 'pending';

  const handleSave = (): void => {
    if (!canSave) {
      toast.error('Configuração incompleta', {
        description:
          'Selecione o campo que deve atualizar este campo antes de salvar.',
      });
      return;
    }

    saveConfig.mutate({
      ...draft,
      sourceTableId: effectiveSourceTableId,
      sourceTableSlug: effectiveSourceTableSlug,
      parentFieldId: effectiveParentFieldId,
      parentFieldSlug: effectiveParentFieldSlug,
      childFieldId: effectiveChildFieldId,
      childFieldSlug: effectiveChildFieldSlug,
      enabled: Boolean(draft.enabled),
      parentWidth: normalizeWidth(draft.parentWidth),
      childWidth: normalizeWidth(draft.childWidth),
      filters: draft.filters ?? [],
    });
  };

  const parentSummary =
    selectedParentField?.name ??
    `Selecione o campo que atualiza ${targetField.name}`;
  const showFilterFieldSelect = compatibleFilterFieldsForParent.length !== 1;
  let filterFieldsGridClass = 'grid gap-3';
  if (showFilterFieldSelect)
    filterFieldsGridClass = 'grid gap-3 md:grid-cols-2';
  let savedStatus = 'Configuração ainda não salva';
  if (draft._id || configQuery.data) savedStatus = 'Configuração salva';

  const filtersContent = (draft.filters ?? []).map((filter) => {
    const selectedField = filterFields.find(
      (field) => field._id === filter.fieldId,
    );
    const operators = getOperators(filter.fieldType);
    const showValue =
      filter.operator !== 'is_empty' &&
      filter.operator !== 'is_not_empty' &&
      filter.operator !== 'date_between';
    let fieldOptions: ReturnType<typeof getFieldOptions> = [];
    if (selectedField) fieldOptions = getFieldOptions(selectedField);

    return (
      <div
        key={filter.id}
        className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_150px_1fr_auto]"
      >
        <Select
          value={filter.fieldId || EMPTY_VALUE}
          disabled={disabled}
          onValueChange={(value) => {
            const field = filterFields.find((item) => item._id === value);
            if (!field) return;
            updateFilter(filter.id, (current) => ({
              ...current,
              fieldId: field._id,
              fieldSlug: field.slug,
              fieldType: field.type,
              operator: getOperators(field.type)[0]?.value ?? 'equals',
              value: null,
              values: [],
              dateStart: null,
              dateEnd: null,
            }));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Campo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY_VALUE}>Campo</SelectItem>
            {filterFields.map((field) => (
              <SelectItem
                key={field._id}
                value={field._id}
              >
                {field.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filter.operator}
          disabled={disabled || !filter.fieldId}
          onValueChange={(value) => {
            const match = operators.find(
              (operator) => operator.value === value,
            );
            if (!match) return;
            updateFilter(filter.id, (current) => ({
              ...current,
              operator: match.value,
              value: null,
              values: [],
              dateStart: null,
              dateEnd: null,
            }));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Operador" />
          </SelectTrigger>
          <SelectContent>
            {operators.map((operator) => (
              <SelectItem
                key={operator.value}
                value={operator.value}
              >
                {operator.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showValue &&
          selectedField &&
          (selectedField.type === E_FIELD_TYPE.DROPDOWN ||
            selectedField.type === E_FIELD_TYPE.CATEGORY) && (
            <Select
              value={filter.values[0] || EMPTY_VALUE}
              disabled={disabled}
              onValueChange={(value) => {
                updateFilter(filter.id, (current) => {
                  let nextValue: string | null = value;
                  if (value === EMPTY_VALUE) nextValue = null;
                  let nextValues: Array<string> = [value];
                  if (value === EMPTY_VALUE) nextValues = [];
                  return { ...current, value: nextValue, values: nextValues };
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Valor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_VALUE}>Valor</SelectItem>
                {fieldOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

        {showValue &&
          selectedField &&
          selectedField.type !== E_FIELD_TYPE.DROPDOWN &&
          selectedField.type !== E_FIELD_TYPE.CATEGORY && (
            <Input
              value={filter.value ?? ''}
              disabled={disabled}
              placeholder="Valor"
              onChange={(event) => {
                updateFilter(filter.id, (current) => ({
                  ...current,
                  value: event.target.value,
                  values: [],
                }));
              }}
            />
          )}

        {filter.operator === 'date_between' && (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={filter.dateStart ?? ''}
              disabled={disabled}
              onChange={(event) => {
                updateFilter(filter.id, (current) => ({
                  ...current,
                  dateStart: event.target.value || null,
                }));
              }}
            />
            <Input
              type="date"
              value={filter.dateEnd ?? ''}
              disabled={disabled}
              onChange={(event) => {
                updateFilter(filter.id, (current) => ({
                  ...current,
                  dateEnd: event.target.value || null,
                }));
              }}
            />
          </div>
        )}

        {!showValue && <div />}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() =>
            setDraft((current) => {
              if (!current) return current;
              return {
                ...current,
                filters: (current.filters ?? []).filter(
                  (item) => item.id !== filter.id,
                ),
              };
            })
          }
        >
          <TrashIcon className="size-4" />
        </Button>
      </div>
    );
  });

  return (
    <section className="rounded-md border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 font-medium">
            <GitBranchIcon className="size-4" />
            <span>Dropdown em cascata</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {draft.parentFieldId &&
              `${targetField.name} será atualizado quando ${parentSummary} mudar.`}
            {!draft.parentFieldId && parentSummary}
          </p>
          <p className="text-xs text-muted-foreground">{savedStatus}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ativo</span>
            <Switch
              checked={Boolean(draft.enabled)}
              disabled={disabled}
              onCheckedChange={(checked) =>
                setDraft((current) => {
                  if (!current) return current;
                  return { ...current, enabled: checked };
                })
              }
            />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
              >
                <SettingsIcon className="size-4" />
                <span>Configurar</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  Configurar atualização de {targetField.name}
                </DialogTitle>
                <DialogDescription>
                  Escolha qual campo, ao sofrer alteração, deve atualizar as
                  opções deste campo.
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                <div className={filterFieldsGridClass}>
                  <Field>
                    <FieldLabel>
                      Campo que atualiza {targetField.name}
                    </FieldLabel>
                    <Select
                      value={draft.parentFieldSlug || EMPTY_VALUE}
                      disabled={disabled}
                      onValueChange={(value) => {
                        if (value !== EMPTY_VALUE) setParentField(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o campo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_VALUE}>Selecione</SelectItem>
                        {parentFields.map((field) => (
                          <SelectItem
                            key={field._id}
                            value={field.slug}
                          >
                            {field.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {showFilterFieldSelect && (
                    <Field>
                      <FieldLabel>
                        Campo correspondente em {sourceTable.data.name}
                      </FieldLabel>
                      <Select
                        value={draft.childFieldSlug || EMPTY_VALUE}
                        disabled={disabled}
                        onValueChange={(value) => {
                          if (value !== EMPTY_VALUE) setFilterField(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o campo correspondente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={EMPTY_VALUE}>Selecione</SelectItem>
                          {compatibleFilterFieldsForParent.map((field) => (
                            <SelectItem
                              key={field._id}
                              value={field.slug}
                            >
                              {field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        Filtros da fonte de dados
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sem filtros extras, apenas o campo escolhido limita as
                        opções.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      onClick={() =>
                        setDraft((current) => {
                          if (!current) return current;
                          return {
                            ...current,
                            filters: [...(current.filters ?? []), newFilter()],
                          };
                        })
                      }
                    >
                      <PlusIcon className="size-4" />
                      <span>Adicionar filtro</span>
                    </Button>
                  </div>

                  {filtersContent}
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    ref={closeRef}
                    type="button"
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  disabled={!canSave}
                  onClick={handleSave}
                >
                  {saveConfig.status === 'pending' && <Spinner />}
                  <span>Salvar configuração</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
}
