import { TrashIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

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
import { useDeleteGroupRow } from '@/hooks/tanstack-query/use-group-row-delete';
import { handleApiError } from '@/lib/handle-api-error';

type GroupRowDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableSlug: string;
  rowId: string;
  groupSlug: string;
  itemId: string;
};

export function GroupRowDeleteDialog({
  open,
  onOpenChange,
  tableSlug,
  rowId,
  groupSlug,
  itemId,
}: GroupRowDeleteDialogProps): React.JSX.Element {
  const _delete = useDeleteGroupRow({
    onSuccess() {
      toast.success('Item removido', {
        description: 'O item foi removido com sucesso',
      });
      onOpenChange(false);
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao remover item' });
    },
  });

  return (
    <Dialog
      data-slot="group-row-delete-dialog"
      data-test-id="group-row-delete-dialog"
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover item</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover este item? Esta acao nao pode ser
            desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={_delete.status === 'pending'}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            data-test-id="group-row-delete-btn"
            disabled={_delete.status === 'pending'}
            onClick={() =>
              _delete.mutate({ tableSlug, rowId, groupSlug, itemId })
            }
          >
            {_delete.status === 'pending' && <Spinner />}
            {_delete.status !== 'pending' && <TrashIcon className="size-4" />}
            <span>Remover</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
