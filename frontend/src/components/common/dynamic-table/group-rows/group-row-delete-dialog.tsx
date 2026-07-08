import { TrashIcon } from 'lucide-react';
import type * as React from 'react';
import { toast } from 'sonner';

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
import { useDeleteGroupRow } from '@/hooks/tanstack-query/use-group-row-delete';
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import { handleApiError } from '@/lib/handle-api-error';
import type { Merge } from '@/lib/interfaces';

type GroupRowDeleteDialogProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  {
    tableSlug: string;
    rowId: string;
    groupSlug: string;
    itemId: string;
  }
>;

export function GroupRowDeleteDialog({
  ref,
  tableSlug,
  rowId,
  groupSlug,
  itemId,
  ...rest
}: GroupRowDeleteDialogProps): React.JSX.Element {
  const { closeRef, close } = useDismissableDialog();

  const _delete = useDeleteGroupRow({
    onSuccess() {
      toast.success('Item removido', {
        description: 'O item foi removido com sucesso',
      });
      close();
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao remover item' });
    },
  });

  return (
    <Dialog>
      <DialogTrigger
        {...rest}
        ref={ref}
      />
      <DialogContent
        data-slot="group-row-delete-dialog"
        data-test-id="group-row-delete-dialog"
      >
        <DialogClose
          ref={closeRef}
          className="hidden"
        />
        <DialogHeader>
          <DialogTitle>Remover item</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover este item? Esta acao nao pode ser
            desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={_delete.status === 'pending'}
            >
              Cancelar
            </Button>
          </DialogClose>
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
