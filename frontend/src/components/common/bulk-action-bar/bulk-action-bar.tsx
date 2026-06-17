import { ArchiveRestoreIcon, Trash2Icon, XIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';

export type BulkActionBarProps = {
  selectedCount: number;
  isTrashView: boolean;
  canDelete: boolean;
  onClear: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  isTrashing?: boolean;
  isRestoring?: boolean;
  /** Ações extras exibidas na lista ativa (ex.: alterar status em lote). */
  extraActions?: React.ReactNode;
};

export function BulkActionBar(props: BulkActionBarProps): React.JSX.Element {
  const label =
    props.selectedCount === 1
      ? '1 item selecionado'
      : props.selectedCount.toString().concat(' itens selecionados');

  return (
    <div
      data-slot="bulk-action-bar"
      className="sticky bottom-4 z-30 mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-md border bg-background p-3 shadow-md"
    >
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={props.onClear}
          aria-label="Limpar seleção"
        >
          <XIcon className="size-4" />
        </Button>
        <span className="text-sm font-medium">{label}</span>
      </div>

      <div className="flex items-center gap-2">
        {!props.isTrashView && props.extraActions}

        {!props.isTrashView && props.onTrash && (
          <Button
            type="button"
            variant="outline"
            onClick={props.onTrash}
            disabled={props.isTrashing}
          >
            <Trash2Icon className="size-4" />
            <span>Enviar para lixeira</span>
          </Button>
        )}

        {props.isTrashView && props.onRestore && (
          <Button
            type="button"
            variant="outline"
            onClick={props.onRestore}
            disabled={props.isRestoring}
          >
            <ArchiveRestoreIcon className="size-4" />
            <span>Restaurar</span>
          </Button>
        )}

        {props.isTrashView && props.canDelete && props.onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={props.onDelete}
          >
            <Trash2Icon className="size-4" />
            <span>Excluir permanentemente</span>
          </Button>
        )}
      </div>
    </div>
  );
}
