import { useStore } from '@tanstack/react-store';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { withForm } from '@/integrations/tanstack-form/form-hook';

// withForm dá o `form` tipado (shape { label, color } conhecido) — o store e os
// AppField inferem os tipos, eliminando `any`/`as`. defaultValues/props só p/
// type-check; os valores reais vêm do useAppForm do caller.
type AddListProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
};

const ADD_LIST_DEFAULT_VALUES = { label: '', color: '' };

const ADD_LIST_DEFAULT_PROPS: AddListProps = {
  open: false,
  onOpenChange: () => {},
  isSubmitting: false,
};

export const KanbanAddListDialog = withForm({
  defaultValues: ADD_LIST_DEFAULT_VALUES,
  props: ADD_LIST_DEFAULT_PROPS,
  render: function Render({ form, open, onOpenChange, isSubmitting }) {
    const label = useStore(form.store, (state) => state.values.label);
    useStore(form.store, (state) => state.values.color);

    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
      >
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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
                data-test-id="kanban-add-list-btn"
                disabled={!label.trim() || isSubmitting}
              >
                Adicionar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  },
});
