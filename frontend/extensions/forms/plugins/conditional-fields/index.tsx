import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ListFilterIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { conditionalFieldsRuntimeConfigQueryKey } from '@/hooks/tanstack-query/use-conditional-fields-runtime-config';
import { useTablePermission } from '@/hooks/use-table-permission';
import { API } from '@/lib/api';
import type {
  ConditionalFieldRule,
  ConditionalFieldRuleConflict,
  ConditionalFieldsConfig,
} from '@/lib/conditional-form-rules';
import { findConditionalRuleConflicts } from '@/lib/conditional-form-rules';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { ICategory, IField, ITable } from '@/lib/interfaces';

interface Props {
  table?: ITable;
}

type Option = {
  id: string;
  label: string;
};

type TargetFieldGroup = {
  id: string;
  label: string;
  fields: Array<IField>;
};

function getConditionFields(table: ITable): Array<IField> {
  return getConfigurableFields(table).filter((field) => {
    if (field.trashed || field.native) return false;
    return (
      field.type === E_FIELD_TYPE.DROPDOWN ||
      field.type === E_FIELD_TYPE.CATEGORY
    );
  });
}

function getConfigurableFields(table: ITable): Array<IField> {
  const groupFields = (table.groups ?? []).flatMap((group) => group.fields);

  return [...table.fields, ...groupFields].filter(
    (field) => !field.trashed && !field.native,
  );
}

function getFieldDisplayName(table: ITable, field: IField): string {
  const group = (table.groups ?? []).find((item) =>
    item.fields.some((groupField) => groupField._id === field._id),
  );

  if (group) return `${group.name} / ${field.name}`;
  return field.name;
}

function flattenCategories(
  items: Array<ICategory>,
  prefix = '',
): Array<Option> {
  return items.flatMap((item) => {
    let label = item.label;
    if (prefix) label = `${prefix} / ${item.label}`;
    return [
      { id: item.id, label },
      ...flattenCategories(item.children ?? [], label),
    ];
  });
}

function getFieldOptions(field: IField | undefined): Array<Option> {
  if (!field) return [];

  if (field.type === E_FIELD_TYPE.DROPDOWN) {
    return (field.dropdown ?? []).map((option) => ({
      id: option.id,
      label: option.label,
    }));
  }

  if (field.type === E_FIELD_TYPE.CATEGORY) {
    return flattenCategories(field.category ?? []);
  }

  return [];
}

function getRuleTitle(rule: ConditionalFieldRule, index: number): string {
  return rule.label?.trim() || `Regra ${index + 1}`;
}

function getTargetFields(table: ITable): Array<IField> {
  return getConfigurableFields(table);
}

function getTargetFieldGroups(table: ITable): Array<TargetFieldGroup> {
  const tableFields = table.fields.filter(
    (field) => !field.trashed && !field.native,
  );
  const groups = (table.groups ?? [])
    .map((group) => ({
      id: group._id ?? group.slug,
      label: group.name,
      fields: group.fields.filter((field) => !field.trashed && !field.native),
    }))
    .filter((group) => group.fields.length > 0);

  return [
    {
      id: 'table-fields',
      label: 'Campos da tabela',
      fields: tableFields,
    },
    ...groups,
  ].filter((group) => group.fields.length > 0);
}

function removeRuleTarget(
  rule: ConditionalFieldRule,
  fieldId: string,
): ConditionalFieldRule {
  if (!fieldId) return rule;

  return {
    ...rule,
    showFieldIds: rule.showFieldIds.filter((item) => item !== fieldId),
    hideFieldIds: rule.hideFieldIds.filter((item) => item !== fieldId),
  };
}

function normalizeRuleTargets(
  rule: ConditionalFieldRule,
): ConditionalFieldRule {
  return removeRuleTarget(rule, rule.sourceFieldId);
}

function normalizeRule(
  rule: ConditionalFieldRule,
  index: number,
): ConditionalFieldRule {
  const fallbackLabel = `Regra ${index + 1}`;

  return {
    ...normalizeRuleTargets(rule),
    label: rule.label?.trim() || fallbackLabel,
  };
}

function createRule(table: ITable, index: number): ConditionalFieldRule {
  const sourceField = getConditionFields(table)[0];
  const sourceValue = getFieldOptions(sourceField)[0]?.id ?? '';

  return {
    id: crypto.randomUUID(),
    label: `Regra ${index + 1}`,
    sourceFieldId: sourceField?._id ?? '',
    sourceFieldSlug: sourceField?.slug ?? '',
    sourceValue,
    showFieldIds: [],
    hideFieldIds: [],
  };
}

function configQueryKey(slug: string): Array<string> {
  return ['conditional-fields-config', slug];
}

function useConditionalFieldsConfig(
  slug: string,
  enabled: boolean,
): UseQueryResult<ConditionalFieldsConfig, Error> {
  return useQuery({
    queryKey: configQueryKey(slug),
    enabled,
    queryFn: async () => {
      const response = await API.get<ConditionalFieldsConfig>(
        `/plugins/conditional-fields/tables/${slug}/config`,
      );
      return response.data;
    },
  });
}

function useSaveConditionalFieldsConfig(
  slug: string,
): UseMutationResult<
  ConditionalFieldsConfig,
  Error,
  Array<ConditionalFieldRule>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rules: Array<ConditionalFieldRule>) => {
      const response = await API.put<ConditionalFieldsConfig>(
        `/plugins/conditional-fields/tables/${slug}/config`,
        { rules },
      );
      return response.data;
    },
    onSuccess(data) {
      queryClient.setQueryData(configQueryKey(slug), data);
      queryClient.setQueryData(
        conditionalFieldsRuntimeConfigQueryKey(slug),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: conditionalFieldsRuntimeConfigQueryKey(slug),
      });
      toast.success('Configuração salva', {
        description: 'As regras de campos condicionais foram atualizadas.',
      });
    },
    onError() {
      toast.error('Não foi possível salvar', {
        description: 'Revise as regras configuradas e tente novamente.',
      });
    },
  });
}

function updateRuleTarget(
  rule: ConditionalFieldRule,
  fieldId: string,
  action: 'show' | 'hide',
  checked: boolean,
): ConditionalFieldRule {
  const add = (items: Array<string>): Array<string> => {
    if (items.includes(fieldId)) return items;
    return [...items, fieldId];
  };
  const remove = (items: Array<string>): Array<string> =>
    items.filter((item) => item !== fieldId);

  if (action === 'show') {
    let showFieldIds = remove(rule.showFieldIds);
    if (checked) showFieldIds = add(rule.showFieldIds);
    let hideFieldIds = rule.hideFieldIds;
    if (checked) hideFieldIds = remove(rule.hideFieldIds);
    return { ...rule, showFieldIds, hideFieldIds };
  }

  let hideFieldIds = remove(rule.hideFieldIds);
  if (checked) hideFieldIds = add(rule.hideFieldIds);
  let showFieldIds = rule.showFieldIds;
  if (checked) showFieldIds = remove(rule.showFieldIds);
  return { ...rule, hideFieldIds, showFieldIds };
}

function moveRule(
  rules: Array<ConditionalFieldRule>,
  fromIndex: number,
  toIndex: number,
): Array<ConditionalFieldRule> {
  const nextRules = [...rules];
  const [rule] = nextRules.splice(fromIndex, 1);
  nextRules.splice(toIndex, 0, rule);
  return nextRules;
}

function getRuleLabel(
  rules: Array<ConditionalFieldRule>,
  ruleId: string,
): string {
  const index = rules.findIndex((rule) => rule.id === ruleId);
  if (index < 0) return 'Regra ?';

  return getRuleTitle(rules[index], index);
}

function getConflictMessage(
  conflict: ConditionalFieldRuleConflict,
  rules: Array<ConditionalFieldRule>,
  fields: Array<IField>,
): string {
  const fieldName =
    fields.find((field) => field._id === conflict.fieldId)?.name ??
    'campo removido';
  const ruleLabel = getRuleLabel(rules, conflict.ruleIds[0]);

  return `${ruleLabel}: o campo "${fieldName}" está marcado para mostrar e ocultar ao mesmo tempo.`;
}

interface RuleEditorProps {
  rule: ConditionalFieldRule;
  table: ITable;
  index: number;
  totalRules: number;
  open: boolean;
  onChange: (rule: ConditionalFieldRule) => void;
  onOpenChange: (open: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function RuleEditor({
  rule,
  table,
  index,
  totalRules,
  open,
  onChange,
  onOpenChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: RuleEditorProps): React.JSX.Element {
  const conditionFields = getConditionFields(table);
  const sourceField = conditionFields.find(
    (field) => field._id === rule.sourceFieldId,
  );
  const sourceOptions = getFieldOptions(sourceField);
  const targetFieldGroups = getTargetFieldGroups(table)
    .map((group) => ({
      ...group,
      fields: group.fields.filter((field) => field._id !== rule.sourceFieldId),
    }))
    .filter((group) => group.fields.length > 0);
  const title = getRuleTitle(rule, index);
  const sourceFieldName = sourceField?.name ?? 'Campo não encontrado';
  let sourceFieldDisplayName = sourceFieldName;
  if (sourceField) {
    sourceFieldDisplayName = getFieldDisplayName(table, sourceField);
  }
  const sourceValueLabel =
    sourceOptions.find((option) => option.id === rule.sourceValue)?.label ??
    'Valor não encontrado';
  const affectedCount = new Set([...rule.showFieldIds, ...rule.hideFieldIds])
    .size;
  let chevronRotation = '';
  if (open) chevronRotation = 'rotate-180';

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="rounded-md border"
    >
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 p-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="grid min-w-0 grid-cols-[auto_1fr] items-center gap-2 text-left"
            data-test-id={`conditional-rule-toggle-${index}`}
          >
            <ChevronDownIcon
              className={`size-4 text-muted-foreground transition-transform ${chevronRotation}`}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {index + 1}. {title}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {sourceFieldDisplayName} = {sourceValueLabel} - {affectedCount}{' '}
                {affectedCount === 1 && 'campo afetado'}
                {affectedCount !== 1 && 'campos afetados'}
              </span>
            </span>
          </button>
        </CollapsibleTrigger>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={index === 0}
            onClick={onMoveUp}
            data-test-id={`conditional-rule-move-up-${index}`}
          >
            <ArrowUpIcon className="size-4" />
            <span className="sr-only">Mover regra para cima</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={index === totalRules - 1}
            onClick={onMoveDown}
            data-test-id={`conditional-rule-move-down-${index}`}
          >
            <ArrowDownIcon className="size-4" />
            <span className="sr-only">Mover regra para baixo</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            data-test-id={`conditional-rule-remove-${index}`}
          >
            <TrashIcon className="size-4" />
            <span className="sr-only">Remover regra</span>
          </Button>
        </div>
      </div>

      <CollapsibleContent className="grid gap-3 border-t p-3">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Nome da regra</span>
          <Input
            value={rule.label ?? `Regra ${index + 1}`}
            onChange={(event) =>
              onChange({ ...rule, label: event.target.value })
            }
            placeholder={`Regra ${index + 1}`}
            data-test-id={`conditional-rule-label-${index}`}
          />
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Campo controlador</span>
          <Select
            value={rule.sourceFieldId}
            onValueChange={(fieldId) => {
              const field = conditionFields.find(
                (item) => item._id === fieldId,
              );
              const firstValue = getFieldOptions(field)[0]?.id ?? '';
              onChange({
                ...removeRuleTarget(rule, field?._id ?? ''),
                sourceFieldId: field?._id ?? '',
                sourceFieldSlug: field?.slug ?? '',
                sourceValue: firstValue,
              });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um campo" />
            </SelectTrigger>
            <SelectContent>
              {conditionFields.map((field) => (
                <SelectItem
                  key={field._id}
                  value={field._id}
                >
                  {getFieldDisplayName(table, field)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Quando o valor for</span>
          <Select
            value={rule.sourceValue}
            onValueChange={(sourceValue) => onChange({ ...rule, sourceValue })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um valor" />
            </SelectTrigger>
            <SelectContent>
              {sourceOptions.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="grid gap-2">
          <span className="text-sm font-medium">Campos afetados</span>
          <div className="max-h-72 overflow-auto rounded-md border">
            {targetFieldGroups.map((group) => (
              <div key={group.id}>
                <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                  {group.label}
                </div>
                {group.fields.map((field) => {
                  const showChecked = rule.showFieldIds.includes(field._id);
                  const hideChecked = rule.hideFieldIds.includes(field._id);

                  return (
                    <div
                      key={field._id}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b px-3 py-2 last:border-b-0"
                    >
                      <span className="min-w-0 truncate text-sm">
                        {field.name}
                      </span>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={showChecked}
                          onCheckedChange={(checked) =>
                            onChange(
                              updateRuleTarget(
                                rule,
                                field._id,
                                'show',
                                !!checked,
                              ),
                            )
                          }
                        />
                        Mostrar
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={hideChecked}
                          onCheckedChange={(checked) =>
                            onChange(
                              updateRuleTarget(
                                rule,
                                field._id,
                                'hide',
                                !!checked,
                              ),
                            )
                          }
                        />
                        Ocultar
                      </label>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ConditionalFieldsPlugin({
  table,
}: Props): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const permission = useTablePermission(table);
  const slug = table?.slug ?? '';
  let label = 'Configurar campos condicionais';
  if (table) label = `Configurar campos condicionais de ${table.name}`;

  const config = useConditionalFieldsConfig(slug, open && Boolean(table));
  const saveConfig = useSaveConditionalFieldsConfig(slug);
  const [rules, setRules] = React.useState<Array<ConditionalFieldRule>>([]);
  const [openRuleIds, setOpenRuleIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  React.useEffect(() => {
    if (config.data && table) {
      const nextRules = config.data.rules.map(normalizeRule);
      setRules(nextRules);
      setOpenRuleIds(new Set());
    }
  }, [config.data, table]);

  if (!table || permission.isLoading || !permission.can('UPDATE_TABLE')) {
    return <></>;
  }

  const conditionFields = getConditionFields(table);
  const canAddRule = conditionFields.length > 0;
  const conflicts = findConditionalRuleConflicts(rules);
  const targetFields = getTargetFields(table);
  const hasConflicts = conflicts.length > 0;

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
    >
      <SheetTrigger asChild>
        <DropdownMenuItem
          className="w-full"
          onSelect={(event) => event.preventDefault()}
          data-test-id="plugin-conditional-fields-config"
        >
          <ListFilterIcon className="size-4" />
          <span>Configurar condicionais</span>
          <span className="sr-only">{label}</span>
        </DropdownMenuItem>
      </SheetTrigger>

      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Campos condicionais</SheetTitle>
          <SheetDescription>
            Configure regras desta tabela para mostrar ou ocultar campos nos
            formulários.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-auto px-4">
          {conditionFields.length === 0 && (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Crie um campo do tipo dropdown ou categoria para usar como
              controlador das regras.
            </div>
          )}

          {config.status === 'pending' && (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Carregando configuração...
            </div>
          )}

          {config.status === 'error' && (
            <div className="rounded-md border border-destructive p-3 text-sm text-destructive">
              Não foi possível carregar a configuração desta tabela.
            </div>
          )}

          {config.status === 'success' &&
            rules.map((rule, index) => (
              <RuleEditor
                key={rule.id}
                rule={rule}
                table={table}
                index={index}
                totalRules={rules.length}
                open={openRuleIds.has(rule.id)}
                onChange={(nextRule) => {
                  setRules((current) =>
                    current.map((item) => {
                      if (item.id === nextRule.id) return nextRule;
                      return item;
                    }),
                  );
                }}
                onOpenChange={(nextOpen) => {
                  setOpenRuleIds((current) => {
                    const next = new Set(current);
                    if (nextOpen) {
                      next.add(rule.id);
                    } else {
                      next.delete(rule.id);
                    }
                    return next;
                  });
                }}
                onMoveUp={() => {
                  setRules((current) => {
                    if (index > 0) return moveRule(current, index, index - 1);
                    return current;
                  });
                }}
                onMoveDown={() => {
                  setRules((current) => {
                    if (index < current.length - 1) {
                      return moveRule(current, index, index + 1);
                    }
                    return current;
                  });
                }}
                onRemove={() => {
                  setRules((current) =>
                    current.filter((item) => item.id !== rule.id),
                  );
                  setOpenRuleIds((current) => {
                    const next = new Set(current);
                    next.delete(rule.id);
                    return next;
                  });
                }}
              />
            ))}

          {config.status === 'success' && hasConflicts && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Existem conflitos nas regras</AlertTitle>
              <AlertDescription>
                {conflicts.map((conflict) => (
                  <p key={`${conflict.ruleIds.join('-')}-${conflict.fieldId}`}>
                    {getConflictMessage(conflict, rules, targetFields)}
                  </p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {config.status === 'success' && rules.length === 0 && (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Nenhuma regra configurada para esta tabela.
            </div>
          )}
        </div>

        <SheetFooter className="border-t">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={!canAddRule || config.status !== 'success'}
              onClick={() =>
                setRules((current) => [
                  ...current,
                  createRule(table, current.length),
                ])
              }
            >
              <PlusIcon className="size-4" />
              <span>Adicionar regra</span>
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={
                  saveConfig.isPending ||
                  config.status !== 'success' ||
                  hasConflicts
                }
                onClick={() => {
                  if (hasConflicts) {
                    toast.error('Conflito nas regras', {
                      description: 'Resolva os conflitos antes de salvar.',
                    });
                    return;
                  }

                  saveConfig.mutate(rules.map(normalizeRule));
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
