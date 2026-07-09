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
import { Spinner } from '@/components/ui/spinner';
import { withForm } from '@/integrations/tanstack-form/form-hook';
import type { Merge } from '@/lib/interfaces';

// withForm dá o `form` tipado (shape { label } conhecido) — store e AppField
// inferem, eliminando `any`/`as`. defaultValues/props só p/ type-check; os
// valores reais vêm do useAppForm do caller.
type DocumentSidebarAddProps = Merge<
  Omit<React.ComponentProps<typeof DialogTrigger>, 'form'>,
  {
    parentLabel: string | null;
    isPending: boolean;
    closeRef?: React.RefObject<HTMLButtonElement | null>;
  }
>;

const ADD_SECTION_DEFAULT_VALUES = { label: '' };

const ADD_SECTION_DEFAULT_PROPS: DocumentSidebarAddProps = {
  parentLabel: null,
  isPending: false,
};

export const DocumentSidebarAddDialog = withForm({
  defaultValues: ADD_SECTION_DEFAULT_VALUES,
  props: ADD_SECTION_DEFAULT_PROPS,
  render: function Render({
    form,
    ref,
    parentLabel,
    isPending,
    closeRef,
    ...rest
  }): React.JSX.Element {
    const label = useStore(form.store, (state) => state.values.label);

    return (
      <Dialog>
        <DialogTrigger
          {...rest}
          ref={ref}
        />
        <DialogContent
          className="sm:max-w-md"
          data-slot="document-sidebar-add-dialog"
          data-test-id="document-add-dialog"
        >
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
              <DialogClose asChild>
                <Button
                  ref={closeRef}
                  type="button"
                  variant="outline"
                  disabled={isPending}
                >
                  Cancelar
                </Button>
              </DialogClose>
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
