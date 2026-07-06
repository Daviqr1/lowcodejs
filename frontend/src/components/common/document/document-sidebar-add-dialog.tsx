import { useStore } from '@tanstack/react-store';

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
import { Spinner } from '@/components/ui/spinner';
import { withForm } from '@/integrations/tanstack-form/form-hook';

// withForm dá o `form` tipado (shape { label } conhecido) — store e AppField
// inferem, eliminando `any`/`as`. defaultValues/props só p/ type-check; os
// valores reais vêm do useAppForm do caller.
type DocumentSidebarAddProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentLabel: string | null;
  onCancel: () => void;
  isPending: boolean;
};

const ADD_SECTION_DEFAULT_VALUES = { label: '' };

const ADD_SECTION_DEFAULT_PROPS: DocumentSidebarAddProps = {
  open: false,
  onOpenChange: () => {},
  parentLabel: null,
  onCancel: () => {},
  isPending: false,
};

export const DocumentSidebarAddDialog = withForm({
  defaultValues: ADD_SECTION_DEFAULT_VALUES,
  props: ADD_SECTION_DEFAULT_PROPS,
  render: function Render({
    form,
    open,
    onOpenChange,
    parentLabel,
    onCancel,
    isPending,
  }) {
    const label = useStore(form.store, (state) => state.values.label);

    return (
      <Dialog
        data-slot="document-sidebar-add-dialog"
        data-test-id="document-add-dialog"
        open={open}
        onOpenChange={onOpenChange}
      >
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>Nova seção</DialogTitle>
              <DialogDescription>
                {parentLabel && `Criar seção dentro de "${parentLabel}".`}
                {!parentLabel && 'Criar seção na raiz.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <form.AppField name="label">
                {(field) => (
                  <Input
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Nome da seção"
                    autoFocus
                  />
                )}
              </form.AppField>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                data-test-id="document-add-btn"
                type="submit"
                disabled={!label.trim() || isPending}
              >
                {isPending && <Spinner />}
                <span>Criar</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  },
});
