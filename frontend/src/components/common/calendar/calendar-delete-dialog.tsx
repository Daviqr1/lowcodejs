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
import { Spinner } from '@/components/ui/spinner';

type CalendarDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  isPending: boolean;
  onConfirm: () => void;
};

export function CalendarDeleteDialog({
  open,
  onOpenChange,
  title,
  isPending,
  onConfirm,
}: CalendarDeleteDialogProps): React.JSX.Element {
  return (
    <Dialog
      data-slot="calendar-delete-dialog"
      data-test-id="calendar-delete-dialog"
      open={open}
      onOpenChange={onOpenChange}
      modal
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir agendamento</DialogTitle>
          <DialogDescription>
            {title &&
              `Tem certeza que deseja excluir "${title}"? Essa ação não pode ser desfeita.`}
            {!title &&
              'Tem certeza que deseja excluir este agendamento? Essa ação não pode ser desfeita.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 flex gap-2 sm:justify-end">
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
            data-test-id="calendar-delete-btn"
            type="button"
            variant="destructive"
            className="cursor-pointer"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Spinner />}
            <span>Confirmar exclusão</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
