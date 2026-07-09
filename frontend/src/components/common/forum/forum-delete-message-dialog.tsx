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
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import type { Merge } from '@/lib/interfaces';

type ForumDeleteMessageDialogProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  { onConfirm: (close: () => void) => void }
>;

export function ForumDeleteMessageDialog({
  ref,
  onConfirm,
  ...rest
}: ForumDeleteMessageDialogProps): React.JSX.Element {
  const { closeRef, close } = useDismissableDialog();

  return (
    <Dialog>
      <DialogTrigger
        {...rest}
        ref={ref}
      />
      <DialogContent
        className="sm:max-w-sm"
        data-slot="forum-delete-message-dialog"
        data-test-id="forum-delete-message-dialog"
      >
        <DialogHeader>
          <DialogTitle>Excluir mensagem</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir esta mensagem?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-3 flex gap-2 sm:justify-end">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onConfirm(close)}
          >
            Excluir
          </Button>
        </DialogFooter>
        <DialogClose
          ref={closeRef}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
}
