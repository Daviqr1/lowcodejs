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
import { Spinner } from '@/components/ui/spinner';
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import type { Merge } from '@/lib/interfaces';

type CalendarDeleteDialogProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  {
    title?: string;
    isPending: boolean;
    onConfirm: (close: () => void) => void;
  }
>;

export function CalendarDeleteDialog({
  ref,
  title,
  isPending,
  onConfirm,
  ...rest
}: CalendarDeleteDialogProps): React.JSX.Element {
  const { closeRef, close } = useDismissableDialog();

  return (
    <Dialog>
      <DialogTrigger
        {...rest}
        ref={ref}
      />
      <DialogContent
        data-slot="calendar-delete-dialog"
        data-test-id="calendar-delete-dialog"
        className="sm:max-w-sm"
      >
        <DialogClose
          ref={closeRef}
          className="hidden"
        />
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
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={isPending}
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button
            data-test-id="calendar-delete-btn"
            type="button"
            variant="destructive"
            className="cursor-pointer"
            onClick={() => {
              if (isPending) return;
              onConfirm(close);
            }}
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
