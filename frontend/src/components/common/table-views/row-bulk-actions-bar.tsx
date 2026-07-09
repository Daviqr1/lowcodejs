import { useMutation } from '@tanstack/react-query';
import {
  ArchiveRestoreIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import {
  BulkEditFieldDialog,
  getBulkEditableFields,
} from './bulk-edit-field-dialog';
import { useRowSelection } from './use-row-selection';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PermanentDeleteConfirmDialog } from '@/components/common/permanent-delete-confirm-dialog';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useTablePermission } from '@/hooks/use-table-permission';
import { API } from '@/lib/api';
import type { ITable } from '@/lib/interfaces';
import { QueryClient } from '@/lib/query-client';

type RowBulkActionsBarProps = {
  slug: string;
  table?: ITable;
  isTrashView: boolean;
};

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

  const selectedIds = selection?.selectedIds ?? [];
  const selectedCount = selectedIds.length;

  const bulkTrash = useMutation({
    mutationFn: async function (ids: Array<string>) {
      const route = '/tables/'.concat(slug).concat('/rows/bulk-trash');
      const response = await API.patch<{ modified: number }>(route, { ids });
      return response.data;
    },
    onSuccess(result) {
      selection?.clear();
      QueryClient.invalidateQueries({ queryKey: queryKeys.rows.lists(slug) });
      let message = `${result.modified} registros enviados para lixeira!`;
      if (result.modified === 1) message = '1 registro enviado para lixeira!';
      toast.success(message, {
        description: 'Os registros foram movidos para a lixeira',
      });
    },
  });

  const bulkRestore = useMutation({
    mutationFn: async function (ids: Array<string>) {
      const route = '/tables/'.concat(slug).concat('/rows/bulk-restore');
      const response = await API.patch<{ modified: number }>(route, { ids });
      return response.data;
    },
    onSuccess(result) {
      selection?.clear();
      QueryClient.invalidateQueries({ queryKey: queryKeys.rows.lists(slug) });
      let message = `${result.modified} registros restaurados!`;
      if (result.modified === 1) message = '1 registro restaurado!';
      toast.success(message, {
        description: 'Os registros foram restaurados da lixeira',
      });
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
      selection?.clear();
      QueryClient.invalidateQueries({ queryKey: queryKeys.rows.lists(slug) });
      let message = `${result.deleted} registros excluídos permanentemente!`;
      if (result.deleted === 1)
        message = '1 registro excluído permanentemente!';
      toast.success(message);
    },
  });

  if (!selection || selectedCount === 0 || !canUpdateRow) return null;

  const hasEditableFields = getBulkEditableFields(table).length > 0;

  let confirmCount = `${selectedCount} registros`;
  if (selectedCount === 1) confirmCount = '1 registro';

  return (
    <div className="sticky bottom-4 mx-auto flex w-fit items-center gap-3 rounded-lg border bg-background px-4 py-2 shadow-lg">
      <span className="text-sm font-medium">
        {selectedCount === 1 && '1 registro selecionado'}
        {selectedCount !== 1 && `${selectedCount} registros selecionados`}
      </span>

      {isTrashView && (
        <React.Fragment>
          <ConfirmDialog
            asChild
            title="Restaurar registros da lixeira"
            description={`Ao confirmar essa ação, ${confirmCount} ${
              (selectedCount === 1 && 'será restaurado') || 'serão restaurados'
            } da lixeira.`}
            isPending={bulkRestore.status === 'pending'}
            confirmLabel="Confirmar"
            onConfirm={(close) => {
              bulkRestore.mutateAsync(selectedIds, { onSuccess: close });
            }}
          >
            <Button
              variant="outline"
              size="sm"
            >
              <ArchiveRestoreIcon className="size-4" />
              <span>Restaurar</span>
            </Button>
          </ConfirmDialog>
          {canRemoveRow && (
            <PermanentDeleteConfirmDialog
              asChild
              title="Excluir registros permanentemente"
              description="Essa ação é irreversível. Os registros selecionados serão excluídos permanentemente."
              itemsCount={selectedCount}
              isPending={bulkDelete.status === 'pending'}
              onConfirm={(close) => {
                bulkDelete.mutateAsync(selectedIds, { onSuccess: close });
              }}
              testId="bulk-delete-rows-dialog"
            >
              <Button
                variant="destructive"
                size="sm"
              >
                <Trash2Icon className="size-4" />
                <span>Excluir permanentemente</span>
              </Button>
            </PermanentDeleteConfirmDialog>
          )}
        </React.Fragment>
      )}
      {!isTrashView && (
        <React.Fragment>
          {hasEditableFields && (
            <BulkEditFieldDialog
              asChild
              slug={slug}
              table={table}
              selectedIds={selectedIds}
              onSuccess={() => selection.clear()}
            >
              <Button
                variant="outline"
                size="sm"
                data-test-id="bulk-edit-field-btn"
              >
                <PencilIcon className="size-4" />
                <span>Editar campo</span>
              </Button>
            </BulkEditFieldDialog>
          )}
          <ConfirmDialog
            asChild
            title="Enviar registros para a lixeira"
            description={`Ao confirmar essa ação, ${confirmCount} ${
              (selectedCount === 1 && 'será enviado') || 'serão enviados'
            } para a lixeira.`}
            isPending={bulkTrash.status === 'pending'}
            confirmLabel="Confirmar"
            onConfirm={(close) => {
              bulkTrash.mutateAsync(selectedIds, { onSuccess: close });
            }}
          >
            <Button
              variant="destructive"
              size="sm"
            >
              <Trash2Icon className="size-4" />
              <span>Enviar para lixeira</span>
            </Button>
          </ConfirmDialog>
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
  );
}
