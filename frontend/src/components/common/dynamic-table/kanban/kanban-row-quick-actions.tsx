import { CalendarIcon, ColumnsIcon, UserPlusIcon } from 'lucide-react';
import React from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { IField, IUser } from '@/lib/interfaces';
import { getUserInitials } from '@/lib/kanban-helpers';

type EditTarget = 'members' | 'start' | 'due' | 'list' | null;

export function KanbanRowQuickActions({
  members,
  fields,
  editTarget,
  setEditTarget,
  quickForm,
  tableSlug,
}: {
  members: Array<IUser | string>;
  fields: {
    members?: IField;
    startDate?: IField;
    dueDate?: IField;
    list?: IField;
  };
  editTarget: EditTarget;
  setEditTarget: (value: EditTarget) => void;
  // form do useAppForm: shape concreto desconhecido neste boundary reutilizável.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quickForm: any;
  tableSlug: string;
}): React.JSX.Element {
  return (
    <>
      <div
        data-slot="kanban-row-quick-actions"
        data-test-id="kanban-row-quick-actions"
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        <div className="flex -space-x-2">
          {members.map((member, index) => (
            <Avatar
              key={index}
              className="h-7 w-7 border border-background"
            >
              <AvatarFallback className="text-[10px]">
                {getUserInitials(member)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-test-id="kanban-edit-members-btn"
          onClick={() => setEditTarget('members')}
          className="!cursor-pointer"
        >
          <UserPlusIcon className="size-4" />
          <span>Membros</span>
        </Button>
        {fields.startDate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditTarget('start')}
            className="cursor-pointer"
          >
            <CalendarIcon className="size-4" />
            <span>Data de início</span>
          </Button>
        )}
        {fields.dueDate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditTarget('due')}
            className="!cursor-pointer"
          >
            <CalendarIcon className="size-4" />
            <span>Data de vencimento</span>
          </Button>
        )}
        {fields.list && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-test-id="kanban-edit-list-btn"
            onClick={() => setEditTarget('list')}
            className="!cursor-pointer"
          >
            <ColumnsIcon className="size-4" />
            <span>Lista</span>
          </Button>
        )}
      </div>

      {editTarget && (
        <form
          className="mt-4 rounded-md border bg-muted/30 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            quickForm.handleSubmit();
          }}
        >
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              {editTarget === 'members' && fields.members && (
                <quickForm.AppField name={fields.members.slug}>
                  {/* formField expõe componentes de campo do app (TableRow*) — sem tipo exportado. */}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(formField: any) => (
                    <formField.TableRowUserField field={fields.members!} />
                  )}
                </quickForm.AppField>
              )}
              {editTarget === 'start' && fields.startDate && (
                <quickForm.AppField name={fields.startDate.slug}>
                  {/* formField expõe componentes de campo do app (TableRow*) — sem tipo exportado. */}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(formField: any) => (
                    <formField.TableRowDateField field={fields.startDate!} />
                  )}
                </quickForm.AppField>
              )}
              {editTarget === 'due' && fields.dueDate && (
                <quickForm.AppField name={fields.dueDate.slug}>
                  {/* formField expõe componentes de campo do app (TableRow*) — sem tipo exportado. */}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(formField: any) => (
                    <formField.TableRowDateField field={fields.dueDate!} />
                  )}
                </quickForm.AppField>
              )}
              {editTarget === 'list' && fields.list && (
                <quickForm.AppField name={fields.list.slug}>
                  {/* formField expõe componentes de campo do app (TableRow*) — sem tipo exportado. */}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(formField: any) => (
                    <formField.TableRowDropdownField
                      field={fields.list!}
                      tableSlug={tableSlug}
                    />
                  )}
                </quickForm.AppField>
              )}
            </div>
            <div className="flex gap-2 shrink-0 pb-0.5">
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => setEditTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
              >
                Salvar
              </Button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
