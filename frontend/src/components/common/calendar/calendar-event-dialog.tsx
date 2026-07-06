import type { AnyFieldApi } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { BellIcon, PlusIcon, TrashIcon } from 'lucide-react';
import React from 'react';

import { GroupRowsDataTable } from '@/components/common/dynamic-table/group-rows';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import {
  parseDateTimeLocalInputValue,
  toDateTimeLocalInputValue,
} from '@/lib/calendar-helpers';
import type {
  CalendarEventItem,
  CalendarResolvedFields,
} from '@/lib/calendar-helpers';
import { E_FIELD_FORMAT, E_FIELD_TYPE } from '@/lib/constant';
import type { IDropdown, IField, IRow, ITable } from '@/lib/interfaces';
import {
  buildCreateRowDefaultValues,
  buildUpdateRowDefaultValues,
  resolveFieldLabel,
} from '@/lib/table';

type CalendarEventFormValues = {
  title: string;
  description: string;
  start: string;
  end: string;
  color: string;
  [key: string]: unknown;
};

type CalendarEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  fields: CalendarResolvedFields;
  event: CalendarEventItem | null;
  defaultStartDate?: Date | null;
  isPending: boolean;
  extraFields?: Array<IField>;
  tableSlug?: string;
  table?: ITable;
  onSubmit: (payload: {
    title: string;
    description: string;
    start: Date;
    end: Date;
    colorOptionId: string | null;
    extraValues: Record<string, unknown>;
  }) => Promise<void> | void;
  onDeleteClick?: () => void;
  onOpenRecord?: (row: IRow) => void;
};

function getColorOptions(fields: CalendarResolvedFields): Array<IDropdown> {
  if (Array.isArray(fields.colorField?.dropdown)) {
    return fields.colorField.dropdown;
  }
  return [];
}

function buildExtraDefaults(
  extraFields: Array<IField>,
): Record<string, unknown> {
  return buildCreateRowDefaultValues(extraFields);
}

function buildExtraEditValues(
  extraFields: Array<IField>,
  row: IRow,
): Record<string, unknown> {
  return buildUpdateRowDefaultValues(row, extraFields);
}

function getBaseExtraFields(fields: CalendarResolvedFields): Array<IField> {
  return [fields.participantsField, fields.reminderField].filter(
    (f): f is IField => Boolean(f),
  );
}

function getInitialValues(args: {
  event: CalendarEventItem | null;
  defaultStartDate?: Date | null;
  fields: CalendarResolvedFields;
  extraFields?: Array<IField>;
}): CalendarEventFormValues {
  const { event, defaultStartDate, fields, extraFields = [] } = args;
  const colorOptions = getColorOptions(fields);
  const defaultColor = colorOptions[0]?.id ?? '';
  const allExtras = [...getBaseExtraFields(fields), ...extraFields];

  if (event) {
    const selectedColorId =
      colorOptions.find((option) => option.color === event.color)?.id ??
      colorOptions.find((option) => option.label === event.colorLabel)?.id ??
      '';

    const extras = buildExtraEditValues(allExtras, event.row);

    // FIELD_GROUP defaults to [{}] but reminders should default to []
    if (fields.reminderField) {
      const slug = fields.reminderField.slug;
      const rowVal = event.row[slug];
      if (Array.isArray(rowVal) && rowVal.length > 0) {
        extras[slug] = rowVal;
      } else {
        extras[slug] = [];
      }
    }

    return {
      title: event.title,
      description: event.description ?? '',
      start: toDateTimeLocalInputValue(event.start),
      end: toDateTimeLocalInputValue(event.end),
      color: selectedColorId || defaultColor,
      ...extras,
    };
  }

  const start = defaultStartDate ?? new Date();
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const createDefaults = buildExtraDefaults(allExtras);

  // FIELD_GROUP defaults to [{}] but reminders should start empty
  if (fields.reminderField) {
    createDefaults[fields.reminderField.slug] = [];
  }

  return {
    title: '',
    description: '',
    start: toDateTimeLocalInputValue(start),
    end: toDateTimeLocalInputValue(end),
    color: defaultColor,
    ...createDefaults,
  };
}

export function CalendarEventDialog({
  open,
  onOpenChange,
  mode,
  fields,
  event,
  defaultStartDate,
  isPending,
  extraFields = [],
  tableSlug = '',
  table,
  onSubmit,
  onDeleteClick,
  onOpenRecord,
}: CalendarEventDialogProps): React.JSX.Element {
  const form = useAppForm({
    defaultValues: getInitialValues({
      event,
      defaultStartDate,
      fields,
      extraFields,
    }),
    onSubmit: async ({ value }) => {
      const startDate = parseDateTimeLocalInputValue(value.start);
      const endDate = parseDateTimeLocalInputValue(value.end);
      if (!startDate || !endDate) return;
      if (endDate.getTime() <= startDate.getTime()) return;

      const extraValues: Record<string, unknown> = {};
      for (const field of [...getBaseExtraFields(fields), ...extraFields]) {
        extraValues[field.slug] = value[field.slug];
      }

      await onSubmit({
        title: value.title.trim(),
        description: value.description.trim(),
        start: startDate,
        end: endDate,
        colorOptionId: value.color || null,
        extraValues,
      });
    },
  });

  const values: CalendarEventFormValues = useStore(
    form.store,
    (state) => state.values,
  );
  const colorOptions = getColorOptions(fields);

  const reminderSlug = fields.reminderField?.slug;
  let reminderItems: Array<Record<string, unknown>> = [];
  if (reminderSlug) {
    const reminderValue = values[reminderSlug];
    if (Array.isArray(reminderValue)) reminderItems = reminderValue;
  }
  const hasIncompleteReminder = reminderItems.some((item) => {
    const val = String(item.valor ?? '').trim();
    let unit = String(item.unidade ?? '').trim();
    if (Array.isArray(item.unidade)) {
      unit = String(item.unidade[0] ?? '').trim();
    }
    return !val || !unit;
  });

  const canSubmit =
    String(values.title ?? '').trim().length > 0 &&
    String(values.start ?? '').trim().length > 0 &&
    String(values.end ?? '').trim().length > 0 &&
    !hasIncompleteReminder &&
    ((): boolean => {
      const start = parseDateTimeLocalInputValue(String(values.start ?? ''));
      const end = parseDateTimeLocalInputValue(String(values.end ?? ''));
      return Boolean(start && end && end.getTime() > start.getTime());
    })();

  React.useEffect(() => {
    if (!open) return;
    form.reset(
      getInitialValues({ event, defaultStartDate, fields, extraFields }),
    );
  }, [defaultStartDate, event?.rowId, fields.colorField?._id, open]);

  return (
    <Dialog
      data-slot="calendar-event-dialog"
      data-test-id="calendar-event-dialog"
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
    >
      <DialogContent className="sm:max-w-xl">
        <form
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' && 'Novo agendamento'}
              {mode !== 'create' && 'Editar agendamento'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create' && 'Crie um registro na agenda.'}
              {mode !== 'create' &&
                'Atualize os dados do registro na agenda selecionado.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <form.AppField name="title">
                  {(field: AnyFieldApi) => (
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Título</label>
                      <Input
                        className="w-full"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Ex: Reunião com equipe"
                        autoFocus
                      />
                    </div>
                  )}
                </form.AppField>
              </div>

              {fields.colorField && colorOptions.length > 0 && (
                <div>
                  <form.AppField name="color">
                    {(field: AnyFieldApi) => (
                      <div>
                        <label className="text-sm font-medium">Cor</label>
                        <Select
                          value={((): string => {
                            if (typeof field.state.value === 'string') {
                              return field.state.value;
                            }
                            return '';
                          })()}
                          onValueChange={(value) => {
                            field.handleChange(value);
                            field.handleBlur();
                          }}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="Selecione uma cor" />
                          </SelectTrigger>
                          <SelectContent>
                            {colorOptions.map((option) => (
                              <SelectItem
                                key={option.id}
                                value={option.id}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className="size-2.5 rounded-full"
                                    style={{
                                      backgroundColor: option.color ?? '#999',
                                    }}
                                  />
                                  <span>{option.label}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </form.AppField>
                </div>
              )}
            </div>

            <form.AppField name="description">
              {(field: AnyFieldApi) => (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Detalhes do agendamento (opcional)"
                    className="min-h-[96px]"
                  />
                </div>
              )}
            </form.AppField>

            <div className="grid gap-3 sm:grid-cols-2">
              <form.AppField name="start">
                {(field: AnyFieldApi) => (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Início</label>
                    <Input
                      type="datetime-local"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.AppField>

              <form.AppField name="end">
                {(field: AnyFieldApi) => (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Término</label>
                    <Input
                      type="datetime-local"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.AppField>
            </div>

            {fields.participantsField && (
              <form.AppField name={fields.participantsField.slug}>
                {(formField) => (
                  <formField.TableRowUserField
                    field={fields.participantsField!}
                  />
                )}
              </form.AppField>
            )}

            {fields.reminderField && (
              <form.AppField name={fields.reminderField.slug}>
                {(reminderFormField: AnyFieldApi) => {
                  let items: Array<Record<string, unknown>> = [];
                  const rawReminder = reminderFormField.state.value;
                  if (Array.isArray(rawReminder)) items = rawReminder;

                  const groupSlug = fields.reminderField!.group?.slug;
                  const group = table?.groups?.find(
                    (g) => g.slug === groupSlug,
                  );
                  const unitSubField = group?.fields?.find(
                    (f) => f.slug === 'unidade',
                  );
                  let unitOptions: Array<IDropdown> = [
                    { id: 'minutos', label: 'Minutos', color: null },
                    { id: 'horas', label: 'Horas', color: null },
                    { id: 'dias', label: 'Dias', color: null },
                  ];
                  if (Array.isArray(unitSubField?.dropdown)) {
                    unitOptions = unitSubField.dropdown;
                  }

                  const addReminder = (): void => {
                    reminderFormField.handleChange([
                      ...items,
                      { valor: '30', unidade: ['minutos'] },
                    ]);
                  };

                  const removeReminder = (index: number): void => {
                    reminderFormField.handleChange(
                      items.filter((_, i) => i !== index),
                    );
                  };

                  const updateItem = (
                    index: number,
                    key: string,
                    val: unknown,
                  ): void => {
                    reminderFormField.handleChange(
                      items.map((item, i) => {
                        if (i === index) {
                          return { ...item, [key]: val };
                        }
                        return item;
                      }),
                    );
                  };

                  return (
                    <section className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-1.5">
                          <BellIcon className="size-3.5" />
                          Lembretes
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 cursor-pointer text-xs"
                          onClick={addReminder}
                        >
                          <PlusIcon className="size-3.5" />
                          Adicionar
                        </Button>
                      </div>
                      {items.map((item, index) => {
                        const rawUnit = item.unidade;
                        let unitVal = String(rawUnit ?? '');
                        if (Array.isArray(rawUnit)) {
                          unitVal = String(rawUnit[0] ?? '');
                        }
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-2 rounded-lg border bg-background p-2"
                          >
                            <span className="text-sm text-muted-foreground shrink-0">
                              Notificar
                            </span>
                            <Input
                              type="number"
                              min={1}
                              className="w-20"
                              value={String(item.valor ?? '')}
                              onChange={(e) =>
                                updateItem(index, 'valor', e.target.value)
                              }
                            />
                            <Select
                              value={unitVal}
                              onValueChange={(v) =>
                                updateItem(index, 'unidade', [v])
                              }
                            >
                              <SelectTrigger className="w-28 cursor-pointer">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {unitOptions.map((opt) => (
                                  <SelectItem
                                    key={opt.id}
                                    value={opt.id}
                                  >
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-sm text-muted-foreground shrink-0">
                              antes
                            </span>
                            <div className="ml-auto">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                                onClick={() => removeReminder(index)}
                                aria-label="Excluir lembrete"
                              >
                                <TrashIcon className="size-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </section>
                  );
                }}
              </form.AppField>
            )}

            {extraFields.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Campos adicionais</h3>
                {extraFields.map((field) => (
                  <form.AppField
                    key={field._id}
                    name={field.slug}
                  >
                    {(formField) => {
                      switch (field.type) {
                        case E_FIELD_TYPE.TEXT_SHORT:
                          return <formField.TableRowTextField field={field} />;
                        case E_FIELD_TYPE.TEXT_LONG:
                          if (field.format === E_FIELD_FORMAT.RICH_TEXT) {
                            return (
                              <formField.TableRowRichTextField field={field} />
                            );
                          }
                          return (
                            <formField.TableRowTextareaField field={field} />
                          );
                        case E_FIELD_TYPE.DROPDOWN:
                          return (
                            <formField.TableRowDropdownField
                              field={field}
                              tableSlug={tableSlug}
                            />
                          );
                        case E_FIELD_TYPE.DATE:
                          return <formField.TableRowDateField field={field} />;
                        case E_FIELD_TYPE.FILE:
                          return <formField.TableRowFileField field={field} />;
                        case E_FIELD_TYPE.RELATIONSHIP:
                          return (
                            <formField.TableRowRelationshipField
                              field={field}
                              tableSlug={tableSlug}
                            />
                          );
                        case E_FIELD_TYPE.CATEGORY:
                          return (
                            <formField.TableRowCategoryField field={field} />
                          );
                        case E_FIELD_TYPE.FIELD_GROUP: {
                          // Itens de grupo são salvos via endpoints group-rows
                          // (exigem rowId). Em edição usamos a tabela de itens;
                          // ao criar, pedimos para salvar o agendamento antes.
                          if (event && table) {
                            return (
                              <GroupRowsDataTable
                                tableSlug={tableSlug}
                                rowId={event.rowId}
                                field={field}
                                table={table}
                              />
                            );
                          }
                          return (
                            <div className="space-y-1">
                              <span className="text-sm font-medium ml-2">
                                {resolveFieldLabel(field, 'detail')}
                              </span>
                              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                                Salve o agendamento para adicionar itens a este
                                grupo.
                              </p>
                            </div>
                          );
                        }
                        case E_FIELD_TYPE.USER:
                          return <formField.TableRowUserField field={field} />;
                        default:
                          return null;
                      }
                    }}
                  </form.AppField>
                ))}
              </section>
            )}

            {hasIncompleteReminder && (
              <p className="text-xs text-destructive">
                Preencha ou remova os lembretes incompletos.
              </p>
            )}
            {!canSubmit && !hasIncompleteReminder && (
              <p className="text-xs text-destructive">
                Preencha título, início e término (término deve ser maior que
                início).
              </p>
            )}
          </div>

          <DialogFooter className="mt-4 flex gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {mode === 'edit' && event && onOpenRecord && (
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => onOpenRecord(event.row)}
                  disabled={isPending}
                >
                  Abrir registro
                </Button>
              )}
              {mode === 'edit' && onDeleteClick && (
                <Button
                  type="button"
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={onDeleteClick}
                  disabled={isPending}
                >
                  Excluir
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                data-test-id="calendar-event-submit-btn"
                type="submit"
                className="cursor-pointer"
                disabled={!canSubmit || isPending}
              >
                {isPending && <Spinner />}
                <span>
                  {mode === 'create' && 'Criar'}
                  {mode !== 'create' && 'Salvar'}
                </span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
