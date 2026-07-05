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

type ForumDeleteMessageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ForumDeleteMessageDialog({
  open,
  onOpenChange,
  onConfirm,
}: ForumDeleteMessageDialogProps): React.JSX.Element {
  return (
    <Dialog
      data-slot="forum-delete-message-dialog"
      data-test-id="forum-delete-message-dialog"
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir mensagem</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir esta mensagem?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-3 flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
