import type { AnyFieldApi } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import React from 'react';

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

export function DocumentSidebarAddDialog({
  open,
  onOpenChange,
  parentLabel,
  form,
  onCancel,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentLabel: string | null;
  // form do useAppForm: shape concreto desconhecido neste boundary reutilizável.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  onCancel: () => void;
  isPending: boolean;
}): React.JSX.Element {
  const label = useStore(form.store, (state: unknown) => {
    // form é any (shape do useAppForm desconhecido); assumimos o contrato do form.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const s = state as { values: { label: string } };
    return s.values.label;
  });

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
              {(field: AnyFieldApi) => (
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
}
