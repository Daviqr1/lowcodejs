import type { AnyFieldApi } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function KanbanAddListDialog({
  open,
  onOpenChange,
  form,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // form do useAppForm: shape concreto desconhecido neste boundary reutilizável.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  isSubmitting: boolean;
}): React.JSX.Element {
  const label = useStore(form.store, (state: unknown) => {
    // form é any (shape do useAppForm desconhecido); assumimos o contrato do form.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const s = state as { values: { label: string } };
    return s.values.label;
  });
  useStore(form.store, (state: unknown) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const s = state as { values: { color: string } };
    return s.values.color;
  });

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
                {(field: AnyFieldApi) => (
                  <Input
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Ex: Revisao"
                  />
                )}
              </form.AppField>
            </div>

            <form.AppField name="color">
              {(field: AnyFieldApi) => (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Cor</label>
                  <input
                    type="color"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
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
}
