import { useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArchiveRestoreIcon,
  ArrowRightIcon,
  EllipsisIcon,
  EyeIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TrashIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { RowSelectAllCheckbox, RowSelectCheckbox } from './use-row-selection';

import { InteractiveDataTable } from '@/components/common/data-table';
import { ExtensionSlot } from '@/components/common/extension-slot';
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
  const [dialogType, setDialogType] = React.useState<
    'trash' | 'restore' | 'delete' | null
  >(null);

  const trashMutation = useMutation({
    mutationFn: async () => {
      await API.patch(`/tables/${slug}/rows/${row._id}/trash`);
    },
    onSuccess() {
      setDialogType(null);
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
      setDialogType(null);
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
      setDialogType(null);
      QueryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(slug),
      });
      toast.success('Registro excluido permanentemente!');
    },
  });

  const activeMutation =
    dialogType === 'trash'
      ? trashMutation
      : dialogType === 'restore'
        ? restoreMutation
        : deleteMutation;

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
                to: '/tables/$slug/row/',
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
                to: '/tables/$slug/row/',
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
            onClick={() => setDialogType('trash')}
          >
            <TrashIcon className="size-4" />
            <span>Enviar para lixeira</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className={cn(
              'inline-flex space-x-1 w-full cursor-pointer',
              (row.trashedAt == null || !canUpdateRow) && 'hidden',
            )}
            onClick={() => setDialogType('restore')}
          >
            <ArchiveRestoreIcon className="size-4" />
            <span>Restaurar</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className={cn(
              'inline-flex space-x-1 w-full cursor-pointer',
              (row.trashedAt == null || !canRemoveRow) && 'hidden',
            )}
            onClick={() => setDialogType('delete')}
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

      <Dialog
        modal
        open={dialogType === 'trash' || dialogType === 'restore'}
        onOpenChange={(open) => {
          if (!open) setDialogType(null);
        }}
      >
        <DialogContent className="py-4 px-6">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'trash' && 'Enviar para lixeira'}
              {dialogType === 'restore' && 'Restaurar da lixeira'}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'trash' &&
                'Ao confirmar essa acao, o registro sera enviado para a lixeira.'}
              {dialogType === 'restore' &&
                'Ao confirmar essa acao, o registro sera restaurado da lixeira.'}
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
                  disabled={activeMutation.status === 'pending'}
                  onClick={() => activeMutation.mutateAsync()}
                >
                  {activeMutation.status === 'pending' && (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  )}
                  {activeMutation.status !== 'pending' && (
                    <span>Confirmar</span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </section>
        </DialogContent>
      </Dialog>

      <PermanentDeleteConfirmDialog
        open={dialogType === 'delete'}
        onOpenChange={(open) => {
          if (!open) setDialogType(null);
        }}
        title="Excluir registro permanentemente"
        description="Essa ação é irreversível. O registro será excluído permanentemente e não poderá ser recuperado."
        itemsCount={1}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        testId="delete-row-singular-dialog"
      />
    </div>
  );
}

interface TableListViewProps {
  data: Array<IRow>;
  headers: Array<IField>;
  order: Array<string>;
}

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
    const cols: Array<ColumnDef<IRow, any>> = [];

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
      cols.push({
        id: '_actions',
        enableHiding: false,
        enableResizing: false,
        size: 80,
        header: canCreateField
          ? (): React.ReactElement => (
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
            )
          : undefined,
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

  const table = useDataTable({
    data,
    columns,
    getRowId: (row) => row._id,
    enableColumnResizing: true,
    persistKey: `list-view:${slug}`,
    initialColumnPinning: {
      left: canTrashRow ? ['_select'] : [],
      right: [
        canTrashRow || canRemoveRow
          ? '_actions'
          : canCreateField
            ? '_create_field'
            : '_navigate',
      ],
    },
  });

  return (
    <div data-test-id="table-list-view">
      <InteractiveDataTable
        table={table}
        onRowClick={(row) => {
          router.navigate({
            to: '/tables/$slug/row/',
            params: { slug },
            search: { _id: row._id },
          });
        }}
      />
    </div>
  );
}
