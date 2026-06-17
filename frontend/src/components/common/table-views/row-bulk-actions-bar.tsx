import { useMutation } from '@tanstack/react-query';
import {
  ArchiveRestoreIcon,
  LoaderCircleIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import React from 'react';

import {
  BulkEditFieldDialog,
  getBulkEditableFields,
} from './bulk-edit-field-dialog';
import { useRowSelection } from './use-row-selection';

import { PermanentDeleteConfirmDialog } from '@/components/common/permanent-delete-confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useTablePermission } from '@/hooks/use-table-permission';
import { API } from '@/lib/api';
import type { ITable } from '@/lib/interfaces';
import { QueryClient } from '@/lib/query-client';
import { toastSuccess } from '@/lib/toast';

interface RowBulkActionsBarProps {
  slug: string;
  table?: ITable;
  isTrashView: boolean;
}

/**
 * Barra de acoes em lote, exibida quando ha registros selecionados em qualquer
 * view que suporte selecao (list, gallery, card, mosaic). Centraliza as acoes
 * de lixeira (enviar/restaurar/excluir) e a edicao em massa de um campo.
 */
export function RowBulkActionsBar({
  slug,
  table,
  isTrashView,
}: RowBulkActionsBarProps): React.JSX.Element | null {
  const selection = useRowSelection();
  const permission = useTablePermission(table);
  const canUpdateRow = permission.can('UPDATE_ROW');
  const canRemoveRow = permission.can('REMOVE_ROW');

  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [dialogAction, setDialogAction] = React.useState<
    'trash' | 'restore' | 'delete'
  >('trash');
  const [showBulkEdit, setShowBulkEdit] = React.useState(false);

  const selectedIds = selection?.selectedIds ?? [];
  const selectedCount = selectedIds.length;

  const bulkTrash = useMutation({
    mutationFn: async function (ids: Array<string>) {
      const route = '/tables/'.concat(slug).concat('/rows/bulk-trash');
      const response = await API.patch<{ modified: number }>(route, { ids });
      return response.data;
    },
    onSuccess(result) {
      setShowConfirmDialog(false);
      selection?.clear();
      QueryClient.invalidateQueries({ queryKey: queryKeys.rows.lists(slug) });
      toastSuccess(
        result.modified === 1
          ? '1 registro enviado para lixeira!'
          : `${result.modified} registros enviados para lixeira!`,
        'Os registros foram movidos para a lixeira',
      );
    },
  });

  const bulkRestore = useMutation({
    mutationFn: async function (ids: Array<string>) {
      const route = '/tables/'.concat(slug).concat('/rows/bulk-restore');
      const response = await API.patch<{ modified: number }>(route, { ids });
      return response.data;
    },
    onSuccess(result) {
      setShowConfirmDialog(false);
      selection?.clear();
      QueryClient.invalidateQueries({ queryKey: queryKeys.rows.lists(slug) });
      toastSuccess(
        result.modified === 1
          ? '1 registro restaurado!'
          : `${result.modified} registros restaurados!`,
        'Os registros foram restaurados da lixeira',
      );
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async function (ids: Array<string>) {
      const route = '/tables/'.concat(slug).concat('/rows/bulk-delete');
      const response = await API.delete<{ deleted: number }>(route, {
        data: { ids },
      });
      return response.data;
    },
    onSuccess(result) {
      setShowConfirmDialog(false);
      selection?.clear();
      QueryClient.invalidateQueries({ queryKey: queryKeys.rows.lists(slug) });
      toastSuccess(
        result.deleted === 1
          ? '1 registro excluído permanentemente!'
          : `${result.deleted} registros excluídos permanentemente!`,
      );
    },
  });

  if (!selection || selectedCount === 0 || !canUpdateRow) return null;

  const hasEditableFields = getBulkEditableFields(table).length > 0;

  return (
    <React.Fragment>
      <div className="sticky bottom-4 mx-auto flex w-fit items-center gap-3 rounded-lg border bg-background px-4 py-2 shadow-lg">
        <span className="text-sm font-medium">
          {selectedCount === 1
            ? '1 registro selecionado'
            : `${selectedCount} registros selecionados`}
        </span>

        {isTrashView ? (
          <React.Fragment>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDialogAction('restore');
                setShowConfirmDialog(true);
              }}
            >
              <ArchiveRestoreIcon className="size-4" />
              <span>Restaurar</span>
            </Button>
            {canRemoveRow && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDialogAction('delete');
                  setShowConfirmDialog(true);
                }}
              >
                <Trash2Icon className="size-4" />
                <span>Excluir permanentemente</span>
              </Button>
            )}
          </React.Fragment>
        ) : (
          <React.Fragment>
            {hasEditableFields && (
              <Button
                variant="outline"
                size="sm"
                data-test-id="bulk-edit-field-btn"
                onClick={() => setShowBulkEdit(true)}
              >
                <PencilIcon className="size-4" />
                <span>Editar campo</span>
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDialogAction('trash');
                setShowConfirmDialog(true);
              }}
            >
              <Trash2Icon className="size-4" />
              <span>Enviar para lixeira</span>
            </Button>
          </React.Fragment>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => selection.clear()}
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      <Dialog
        modal
        open={showConfirmDialog && dialogAction !== 'delete'}
        onOpenChange={setShowConfirmDialog}
      >
        <DialogContent className="py-4 px-6">
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'trash' && 'Enviar registros para a lixeira'}
              {dialogAction === 'restore' && 'Restaurar registros da lixeira'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'trash' &&
                (selectedCount === 1
                  ? 'Ao confirmar essa ação, 1 registro será enviado para a lixeira.'
                  : `Ao confirmar essa ação, ${selectedCount} registros serão enviados para a lixeira.`)}
              {dialogAction === 'restore' &&
                (selectedCount === 1
                  ? 'Ao confirmar essa ação, 1 registro será restaurado da lixeira.'
                  : `Ao confirmar essa ação, ${selectedCount} registros serão restaurados da lixeira.`)}
            </DialogDescription>
          </DialogHeader>
          <section>
            <form className="pt-4 pb-2">
              <DialogFooter className="inline-flex w-full gap-2 justify-end">
                <DialogClose asChild>
                  <Button className="bg-destructive hover:bg-destructive">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  disabled={
                    bulkTrash.status === 'pending' ||
                    bulkRestore.status === 'pending'
                  }
                  onClick={() => {
                    if (dialogAction === 'trash') {
                      bulkTrash.mutateAsync(selectedIds);
                    }
                    if (dialogAction === 'restore') {
                      bulkRestore.mutateAsync(selectedIds);
                    }
                  }}
                >
                  {(bulkTrash.status === 'pending' ||
                    bulkRestore.status === 'pending') && (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  )}
                  {!(
                    bulkTrash.status === 'pending' ||
                    bulkRestore.status === 'pending'
                  ) && <span>Confirmar</span>}
                </Button>
              </DialogFooter>
            </form>
          </section>
        </DialogContent>
      </Dialog>

      <PermanentDeleteConfirmDialog
        open={showConfirmDialog && dialogAction === 'delete'}
        onOpenChange={setShowConfirmDialog}
        title="Excluir registros permanentemente"
        description="Essa ação é irreversível. Os registros selecionados serão excluídos permanentemente."
        itemsCount={selectedCount}
        isPending={bulkDelete.status === 'pending'}
        onConfirm={() => bulkDelete.mutateAsync(selectedIds)}
        testId="bulk-delete-rows-dialog"
      />

      <BulkEditFieldDialog
        slug={slug}
        table={table}
        selectedIds={selectedIds}
        open={showBulkEdit}
        onOpenChange={setShowBulkEdit}
        onSuccess={() => selection.clear()}
      />
    </React.Fragment>
  );
}
