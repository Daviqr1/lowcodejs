import { useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArchiveRestoreIcon,
  ArrowRightIcon,
  EllipsisIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TrashIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { RowSelectAllCheckbox, RowSelectCheckbox } from './use-row-selection';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { InteractiveDataTable } from '@/components/common/data-table';
import { ExtensionSlot } from '@/components/common/extension-slot';
import { PermanentDeleteConfirmDialog } from '@/components/common/permanent-delete-confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useDataTable } from '@/hooks/use-data-table';
import { useFieldColumns } from '@/hooks/use-field-columns';
import { useTablePermission } from '@/hooks/use-table-permission';
import { API } from '@/lib/api';
import type { IField, IRow, ITable } from '@/lib/interfaces';
import { QueryClient } from '@/lib/query-client';
import { cn } from '@/lib/utils';

function RowActionsCell({
  row,
  slug,
  table,
  canUpdateRow,
  canRemoveRow,
}: {
  row: IRow;
  slug: string;
  table?: ITable;
  canUpdateRow: boolean;
  canRemoveRow: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const trashTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const restoreTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const deleteTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  const trashMutation = useMutation({
    mutationFn: async () => {
      await API.patch(`/tables/${slug}/rows/${row._id}/trash`);
    },
    onSuccess() {
      QueryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(slug),
      });
      toast.success('Registro enviado para lixeira!');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      await API.patch(`/tables/${slug}/rows/${row._id}/restore`);
    },
    onSuccess() {
      QueryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(slug),
      });
      toast.success('Registro restaurado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await API.delete(`/tables/${slug}/rows/${row._id}`);
    },
    onSuccess() {
      QueryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(slug),
      });
      toast.success('Registro excluido permanentemente!');
    },
  });

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu
        dir="ltr"
        modal={false}
      >
        <DropdownMenuTrigger className="p-1 rounded-full">
          <EllipsisIcon className="size-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent className="mr-10">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="inline-flex space-x-1 w-full cursor-pointer"
            onClick={() =>
              router.navigate({
                to: '/tables/$slug/row',
                params: { slug },
                search: { _id: row._id },
              })
            }
          >
            <EyeIcon className="size-4" />
            <span>Visualizar</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className={cn(
              'inline-flex space-x-1 w-full cursor-pointer',
              (row.trashedAt != null || !canUpdateRow) && 'hidden',
            )}
            onClick={() =>
              router.navigate({
                to: '/tables/$slug/row',
                params: { slug },
                search: { _id: row._id, mode: 'edit' as const },
              })
            }
          >
            <PencilIcon className="size-4" />
            <span>Editar</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className={cn(
              'inline-flex space-x-1 w-full cursor-pointer',
              (row.trashedAt != null || !canUpdateRow) && 'hidden',
            )}
            onClick={() => trashTriggerRef.current?.click()}
          >
            <TrashIcon className="size-4" />
            <span>Enviar para lixeira</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className={cn(
              'inline-flex space-x-1 w-full cursor-pointer',
              (row.trashedAt == null || !canUpdateRow) && 'hidden',
            )}
            onClick={() => restoreTriggerRef.current?.click()}
          >
            <ArchiveRestoreIcon className="size-4" />
            <span>Restaurar</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className={cn(
              'inline-flex space-x-1 w-full cursor-pointer',
              (row.trashedAt == null || !canRemoveRow) && 'hidden',
            )}
            onClick={() => deleteTriggerRef.current?.click()}
          >
            <Trash2Icon className="size-4" />
            <span>Excluir permanentemente</span>
          </DropdownMenuItem>

          <ExtensionSlot
            id="table.row.actions"
            context={{ table, row, slug }}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        ref={trashTriggerRef}
        title="Enviar para lixeira"
        description="Ao confirmar essa acao, o registro sera enviado para a lixeira."
        confirmLabel="Confirmar"
        isPending={trashMutation.status === 'pending'}
        onConfirm={(close) => {
          void trashMutation
            .mutateAsync()
            .then(close)
            .catch(() => {});
        }}
      />

      <ConfirmDialog
        ref={restoreTriggerRef}
        title="Restaurar da lixeira"
        description="Ao confirmar essa acao, o registro sera restaurado da lixeira."
        confirmLabel="Confirmar"
        isPending={restoreMutation.status === 'pending'}
        onConfirm={(close) => {
          void restoreMutation
            .mutateAsync()
            .then(close)
            .catch(() => {});
        }}
      />

      <PermanentDeleteConfirmDialog
        ref={deleteTriggerRef}
        title="Excluir registro permanentemente"
        description="Essa ação é irreversível. O registro será excluído permanentemente e não poderá ser recuperado."
        itemsCount={1}
        isPending={deleteMutation.isPending}
        onConfirm={(close) => {
          void deleteMutation
            .mutateAsync()
            .then(close)
            .catch(() => {});
        }}
        testId="delete-row-singular-dialog"
      />
    </div>
  );
}

type TableListViewProps = {
  data: Array<IRow>;
  headers: Array<IField>;
  order: Array<string>;
};

export function TableListView({
  data,
  headers,
  order,
}: TableListViewProps): React.ReactElement {
  const router = useRouter();
  const { slug } = useParams({ from: '/_private/tables/$slug/' });

  const table_ = useReadTable({ slug });
  const permission = useTablePermission(table_.data);

  const canCreateField = permission.can('CREATE_FIELD');
  const canEditField = permission.can('UPDATE_FIELD');
  const canTrashRow = permission.can('UPDATE_ROW');
  const canRemoveRow = permission.can('REMOVE_ROW');

  const fieldColumns = useFieldColumns({
    fields: headers,
    fieldOrder: order,
    tableSlug: slug,
    canEditField,
  });

  const columns = React.useMemo(() => {
    const cols: Array<ColumnDef<IRow>> = [];

    if (canTrashRow) {
      cols.push({
        id: '_select',
        enableHiding: false,
        enableResizing: false,
        size: 40,
        header: ({ table }) => (
          <RowSelectAllCheckbox
            ids={table.getRowModel().rows.map((r) => r.id)}
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <RowSelectCheckbox
              id={row.original._id}
              label={`Selecionar registro ${row.id}`}
            />
          </div>
        ),
      });
    }

    cols.push(...fieldColumns);

    if (canTrashRow || canRemoveRow) {
      let actionsHeader: (() => React.ReactElement) | undefined;
      if (canCreateField) {
        actionsHeader = (): React.ReactElement => (
          <Button
            variant="outline"
            className="cursor-pointer size-6"
            onClick={() => {
              router.navigate({
                to: '/tables/$slug/field/create',
                replace: true,
                params: { slug },
              });
            }}
          >
            <PlusIcon className="size-4" />
          </Button>
        );
      }
      cols.push({
        id: '_actions',
        enableHiding: false,
        enableResizing: false,
        size: 80,
        header: actionsHeader,
        cell: ({ row }) => (
          <RowActionsCell
            row={row.original}
            slug={slug}
            table={table_.data}
            canUpdateRow={canTrashRow}
            canRemoveRow={canRemoveRow}
          />
        ),
      });
    }

    if (!(canTrashRow || canRemoveRow) && canCreateField) {
      cols.push({
        id: '_create_field',
        enableHiding: false,
        enableResizing: false,
        size: 50,
        header: () => (
          <Button
            variant="outline"
            className="cursor-pointer size-6"
            onClick={() => {
              router.navigate({
                to: '/tables/$slug/field/create',
                replace: true,
                params: { slug },
              });
            }}
          >
            <PlusIcon className="size-4" />
          </Button>
        ),
        cell: () => null,
      });
    } else if (!(canTrashRow || canRemoveRow)) {
      cols.push({
        id: '_navigate',
        enableHiding: false,
        enableResizing: false,
        size: 50,
        cell: () => (
          <Button
            variant="ghost"
            size="icon-sm"
          >
            <ArrowRightIcon />
          </Button>
        ),
      });
    }

    return cols;
  }, [
    canTrashRow,
    canRemoveRow,
    canCreateField,
    fieldColumns,
    router,
    slug,
    table_.data,
  ]);

  let leftPinning: Array<string> = [];
  if (canTrashRow) leftPinning = ['_select'];
  let rightPinId = '_navigate';
  if (canTrashRow || canRemoveRow) rightPinId = '_actions';
  else if (canCreateField) rightPinId = '_create_field';

  const table = useDataTable({
    data,
    columns,
    getRowId: (row) => row._id,
    enableColumnResizing: true,
    persistKey: `list-view:${slug}`,
    initialColumnPinning: {
      left: leftPinning,
      right: [rightPinId],
    },
  });

  return (
    <div data-test-id="table-list-view">
      <InteractiveDataTable
        table={table}
        onRowClick={(row) => {
          router.navigate({
            to: '/tables/$slug/row',
            params: { slug },
            search: { _id: row._id },
          });
        }}
      />
    </div>
  );
}
