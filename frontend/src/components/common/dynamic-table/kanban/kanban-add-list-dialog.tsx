import { useStore } from '@tanstack/react-store';
import type * as React from 'react';

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
import { Input } from '@/components/ui/input';
import { withForm } from '@/integrations/tanstack-form/form-hook';
import type { Merge } from '@/lib/interfaces';

// withForm dá o `form` tipado (shape { label, color } conhecido) — o store e os
// AppField inferem os tipos, eliminando `any`/`as`. defaultValues/props só p/
// type-check; os valores reais vêm do useAppForm do caller.
type AddListProps = Merge<
  Omit<React.ComponentProps<typeof DialogTrigger>, 'form'>,
  {
    isSubmitting: boolean;
    closeRef?: React.RefObject<HTMLButtonElement | null>;
  }
>;

const ADD_LIST_DEFAULT_VALUES = { label: '', color: '' };

const ADD_LIST_DEFAULT_PROPS: AddListProps = {
  isSubmitting: false,
};

export const KanbanAddListDialog = withForm({
  defaultValues: ADD_LIST_DEFAULT_VALUES,
  props: ADD_LIST_DEFAULT_PROPS,
  render: function Render({
    form,
    ref,
    isSubmitting,
    closeRef,
    ...rest
  }): React.JSX.Element {
    const label = useStore(form.store, (state) => state.values.label);
    useStore(form.store, (state) => state.values.color);

    return (
      <Dialog>
        <DialogTrigger
          {...rest}
          ref={ref}
        />
        <DialogContent
          data-slot="kanban-add-list-dialog"
          data-test-id="kanban-add-list-dialog"
          className="max-w-md"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>Adicionar lista</DialogTitle>
              <DialogDescription>
                Crie uma nova coluna no kanban.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nome</label>
                <form.AppField name="label">
                  {(field) => (
                    <Input
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      placeholder="Ex: Revisao"
                    />
                  )}
                </form.AppField>
              </div>

              <form.AppField name="color">
                {(field) => (
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium">Cor</label>
                    <input
                      type="color"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      className="h-8 w-12 rounded border bg-transparent p-0"
                    />
                    <span className="text-xs text-muted-foreground">
                      {field.state.value}
                    </span>
                  </div>
                )}
              </form.AppField>
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button
                  ref={closeRef}
                  type="button"
                  variant="ghost"
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="cursor-pointer"
                data-test-id="kanban-add-list-btn"
                disabled={!label.trim() || isSubmitting}
              >
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  },
});
