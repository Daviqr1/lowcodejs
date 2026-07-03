import { PlusIcon, TrashIcon } from 'lucide-react';
import React from 'react';

import { badgeStyleFromColor } from '@/components/common/dynamic-table/table-cells/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { E_FIELD_FORMAT, E_FIELD_TYPE } from '@/lib/constant';
import type { IField } from '@/lib/interfaces';
import type { FieldMap } from '@/lib/kanban-types';

// Grupo de campos é salvo via endpoints group-rows, que exigem o rowId.
// No card novo (ainda sem rowId) só exibimos o aviso para salvar primeiro.
function GroupFieldCreateHint({ name }: { name: string }): React.JSX.Element {
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium ml-2">{name}</span>
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        Salve o card para adicionar itens a este grupo.
      </p>
    </div>
  );
}

export function KanbanCreateCardDialog({
  open,
  onOpenChange,
  createForm,
  fields,
  extraFields,
  tableSlug,
  createColumnOption,
  isSubmitting,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createForm: any;
  fields: FieldMap;
  extraFields: Array<IField>;
  tableSlug: string;
  createColumnOption?: { id: string; label: string; color?: string | null };
  isSubmitting: boolean;
  onCancel: () => void;
}): React.JSX.Element {
  return (
    <Dialog
      modal={false}
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        data-slot="kanban-create-card-dialog"
        data-test-id="kanban-create-card-dialog"
        className="w-[min(95vw,1400px)] max-w-[95vw] sm:max-w-[1200px] lg:max-w-[1400px] h-[85vh] overflow-hidden p-0"
      >
        <form
          className="grid grid-cols-1 lg:grid-cols-[1fr_280px] h-full min-h-0"
          onSubmit={(event) => {
            event.preventDefault();
            createForm.handleSubmit();
          }}
        >
          <div className="overflow-y-auto min-h-0 p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">
                Novo card
              </DialogTitle>
              <DialogDescription>
                {((): string => {
                  if (createColumnOption?.label) {
                    return `Adicionar em ${createColumnOption.label}`;
                  }
                  return 'Preencha os dados do card.';
                })()}
              </DialogDescription>
            </DialogHeader>

            {fields.title && (
              <createForm.AppField name={fields.title.slug}>
                {(formField: any) => (
                  <formField.TableRowTextField field={fields.title!} />
                )}
              </createForm.AppField>
            )}

            {(fields.members || fields.startDate || fields.dueDate) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {fields.members && (
                  <div className="md:col-span-2">
                    <createForm.AppField name={fields.members.slug}>
                      {(formField: any) => (
                        <formField.TableRowUserField field={fields.members!} />
                      )}
                    </createForm.AppField>
                  </div>
                )}
                {fields.startDate && (
                  <div className="md:col-span-1">
                    <createForm.AppField name={fields.startDate.slug}>
                      {(formField: any) => (
                        <formField.TableRowDateField
                          field={fields.startDate!}
                        />
                      )}
                    </createForm.AppField>
                  </div>
                )}
                {fields.dueDate && (
                  <div className="md:col-span-1">
                    <createForm.AppField name={fields.dueDate.slug}>
                      {(formField: any) => (
                        <formField.TableRowDateField field={fields.dueDate!} />
                      )}
                    </createForm.AppField>
                  </div>
                )}
              </div>
            )}

            {fields.description && (
              <createForm.AppField name={fields.description.slug}>
                {(formField: any) => {
                  if (fields.description?.format === E_FIELD_FORMAT.RICH_TEXT) {
                    return (
                      <formField.TableRowRichTextField
                        field={fields.description}
                      />
                    );
                  }
                  return (
                    <formField.TableRowTextareaField
                      field={fields.description!}
                    />
                  );
                }}
              </createForm.AppField>
            )}

            {fields.tasks && (
              <createForm.AppField name={fields.tasks.slug}>
                {(tasksField: any) => (
                  <createForm.AppField name="__kanbanTaskDraft">
                    {(taskDraftField: any) => {
                      let tasks: Array<Record<string, unknown>> = [];
                      if (Array.isArray(tasksField.state.value)) {
                        tasks = tasksField.state.value;
                      }

                      const addTask = (): void => {
                        const title = String(
                          taskDraftField.state.value ?? '',
                        ).trim();
                        if (!title) return;

                        tasksField.handleChange([
                          ...tasks,
                          {
                            titulo: title,
                            realizado: ['nao'],
                          },
                        ]);
                        taskDraftField.handleChange('');
                      };

                      return (
                        <section className="space-y-3">
                          <h3 className="text-sm font-semibold">Tarefas</h3>
                          <div className="space-y-2">
                            {tasks.map(
                              (
                                task: Record<string, unknown>,
                                index: number,
                              ) => (
                                <div
                                  key={`${index}-${String(task.titulo ?? '')}`}
                                  className="flex items-center gap-2 rounded-lg border bg-background p-2"
                                >
                                  <Checkbox
                                    checked={
                                      Array.isArray(task.realizado) &&
                                      task.realizado.includes('sim')
                                    }
                                    onCheckedChange={(checked) => {
                                      const updated = tasks.map(
                                        (
                                          item: Record<string, unknown>,
                                          itemIndex: number,
                                        ) => {
                                          if (itemIndex !== index) return item;
                                          let realizadoValue = 'nao';
                                          if (checked) {
                                            realizadoValue = 'sim';
                                          }
                                          return {
                                            ...item,
                                            realizado: [realizadoValue],
                                          };
                                        },
                                      );
                                      tasksField.handleChange(updated);
                                    }}
                                  />
                                  <span className="flex-1 text-sm">
                                    {String(task.titulo ?? '-')}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                      tasksField.handleChange(
                                        tasks.filter(
                                          (_: unknown, i: number) =>
                                            i !== index,
                                        ),
                                      );
                                    }}
                                    aria-label="Excluir tarefa"
                                  >
                                    <TrashIcon className="size-4" />
                                  </Button>
                                </div>
                              ),
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Input
                              value={String(taskDraftField.state.value ?? '')}
                              onChange={(event) =>
                                taskDraftField.handleChange(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  addTask();
                                }
                              }}
                              placeholder="Nova tarefa"
                            />
                            <Button
                              type="button"
                              onClick={addTask}
                              className="cursor-pointer"
                            >
                              <PlusIcon className="size-4" />
                              <span>Adicionar</span>
                            </Button>
                          </div>
                        </section>
                      );
                    }}
                  </createForm.AppField>
                )}
              </createForm.AppField>
            )}

            {fields.attachments && (
              <createForm.AppField name={fields.attachments.slug}>
                {(formField: any) => {
                  const attachmentsField = {
                    ...fields.attachments!,
                    name: 'Anexos',
                  };
                  if (fields.attachments?.type === E_FIELD_TYPE.FIELD_GROUP) {
                    return (
                      <GroupFieldCreateHint name={attachmentsField.name} />
                    );
                  }
                  return (
                    <formField.TableRowFileField field={attachmentsField} />
                  );
                }}
              </createForm.AppField>
            )}

            {extraFields.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Campos adicionais</h3>
                {extraFields.map((field) => (
                  <createForm.AppField
                    key={field._id}
                    name={field.slug}
                  >
                    {(formField: any) => {
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
                        case E_FIELD_TYPE.FIELD_GROUP:
                          return <GroupFieldCreateHint name={field.name} />;
                        case E_FIELD_TYPE.USER:
                          return <formField.TableRowUserField field={field} />;
                        default:
                          return null;
                      }
                    }}
                  </createForm.AppField>
                ))}
              </section>
            )}
          </div>

          <aside className="border-l bg-muted/30 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <div className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground">Lista</p>
                {((): React.ReactNode => {
                  if (createColumnOption) {
                    return (
                      <Badge
                        variant="outline"
                        style={badgeStyleFromColor(createColumnOption.color)}
                      >
                        {createColumnOption.label}
                      </Badge>
                    );
                  }
                  return (
                    <span className="text-sm text-muted-foreground">-</span>
                  );
                })()}
              </div>
            </div>

            <div className="border-t bg-muted/40 p-4 flex flex-col gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-test-id="kanban-create-card-btn"
                className="cursor-pointer"
              >
                Criar card
              </Button>
            </div>
          </aside>
        </form>
      </DialogContent>
    </Dialog>
  );
}
