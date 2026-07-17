import { CalendarIcon, ColumnsIcon, UserPlusIcon } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { withForm } from '@/integrations/tanstack-form/form-hook';
import type { IField, IUser } from '@/lib/interfaces';
import { getUserInitials } from '@/lib/kanban-helpers';

type EditTarget = 'members' | 'start' | 'due' | 'list' | null;

// withForm dá o `form` tipado (fieldComponents inferidos no AppField) sem passar
// o form como `any`. defaultValues/props só p/ type-check; o form de row
// dinâmico (Record<string, unknown>) vem do useAppForm do caller.
type QuickActionsProps = {
  members: Array<IUser | string>;
  fields: {
    members?: IField;
    startDate?: IField;
    dueDate?: IField;
    list?: IField;
  };
  editTarget: EditTarget;
  setEditTarget: (value: EditTarget) => void;
  tableSlug: string;
};

const QUICK_ACTIONS_DEFAULT_VALUES: Record<string, unknown> = {};

const QUICK_ACTIONS_DEFAULT_PROPS: QuickActionsProps = {
  members: [],
  fields: {},
  editTarget: null,
  setEditTarget: () => {},
  tableSlug: '',
};

export const KanbanRowQuickActions = withForm({
  defaultValues: QUICK_ACTIONS_DEFAULT_VALUES,
  props: QUICK_ACTIONS_DEFAULT_PROPS,
  render: function Render({
    form,
    members,
    fields,
    editTarget,
    setEditTarget,
    tableSlug,
  }) {
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
              form.handleSubmit();
            }}
          >
            <div className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                {editTarget === 'members' && fields.members && (
                  <form.AppField name={fields.members.slug}>
                    {(formField) => (
                      <formField.TableRowUserField field={fields.members!} />
                    )}
                  </form.AppField>
                )}
                {editTarget === 'start' && fields.startDate && (
                  <form.AppField name={fields.startDate.slug}>
                    {(formField) => (
                      <formField.TableRowDateField field={fields.startDate!} />
                    )}
                  </form.AppField>
                )}
                {editTarget === 'due' && fields.dueDate && (
                  <form.AppField name={fields.dueDate.slug}>
                    {(formField) => (
                      <formField.TableRowDateField field={fields.dueDate!} />
                    )}
                  </form.AppField>
                )}
                {editTarget === 'list' && fields.list && (
                  <form.AppField name={fields.list.slug}>
                    {(formField) => (
                      <formField.TableRowDropdownField
                        field={fields.list!}
                        tableSlug={tableSlug}
                      />
                    )}
                  </form.AppField>
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
  },
});
