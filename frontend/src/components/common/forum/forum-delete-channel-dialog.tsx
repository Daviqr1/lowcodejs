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

type ForumDeleteChannelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ForumDeleteChannelDialog({
  open,
  onOpenChange,
  onConfirm,
}: ForumDeleteChannelDialogProps): React.JSX.Element {
  return (
    <Dialog
      data-slot="forum-delete-channel-dialog"
      data-test-id="forum-delete-channel-dialog"
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir canal</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir este canal? As mensagens serão
            removidas.
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
