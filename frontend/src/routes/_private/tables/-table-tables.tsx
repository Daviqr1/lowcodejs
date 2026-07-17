import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArchiveRestoreIcon,
  CopyIcon,
  EllipsisIcon,
  EyeIcon,
  ImageOffIcon,
  PencilIcon,
  Share2Icon,
  Trash2Icon,
  TrashIcon,
  XIcon,
} from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { ActionDialog } from '@/components/common/action-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  DataTable,
  DataTableColumnToggle,
} from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { PermanentDeleteConfirmDialog } from '@/components/common/permanent-delete-confirm-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useDataTable } from '@/hooks/use-data-table';
import {
  usePermission,
  useTablePermission,
} from '@/hooks/use-table-permission';
import { API } from '@/lib/api';
import { formatDate } from '@/lib/format-date';
import { handleApiError } from '@/lib/handle-api-error';
import type { ITable } from '@/lib/interfaces';
import { QueryClient } from '@/lib/query-client';
import { cn } from '@/lib/utils';

const ROUTE_ID = '/_private/tables/';

function ActionsCell({ table }: { table: ITable }): React.JSX.Element {
  const tableRemoveFromTrashButtonRef = React.useRef<HTMLButtonElement | null>(
    null,
  );
  const tableSendToTrashButtonRef = React.useRef<HTMLButtonElement | null>(
    null,
  );

  const permission = useTablePermission(table);
  const router = useRouter();
  const sidebar = useSidebar();
  const hardDeleteTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  const hardDelete = useMutation({
    mutationFn: async function () {
      await API.delete('/tables/'.concat(table.slug));
    },
    onSuccess() {
      QueryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(table.slug),
      });
      QueryClient.invalidateQueries({
        queryKey: queryKeys.tables.lists(),
      });
      toast.success('Tabela excluída permanentemente!', {
        description: 'A tabela foi excluída permanentemente',
      });
      router.navigate({
        to: '/tables',
        replace: true,
        search: { page: 1, perPage: 50 },
      });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao excluir tabela' });
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

        <DropdownMenuContent className="mr-2 sm:mr-10">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="inline-flex space-x-1 w-full cursor-pointer"
            onClick={() => {
              sidebar.setOpen(false);
              router.navigate({
                to: '/tables/$slug',
                params: { slug: table.slug },
              });
            }}
          >
            <EyeIcon className="size-4" />
            <span>Visualizar</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className={cn(
              'inline-flex space-x-1 w-full cursor-pointer',
              !permission.can('UPDATE_TABLE') && 'hidden',
            )}
            onClick={() => {
              sidebar.setOpen(false);
              router.navigate({
                to: '/tables/$slug/detail',
                params: { slug: table.slug },
              });
            }}
          >
            <PencilIcon className="size-4" />
            <span>Editar</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="inline-flex space-x-1 w-full cursor-pointer"
            onClick={() => {
              const url = `${window.location.origin}/tables/${table.slug}`;
              navigator.clipboard.writeText(url);
              toast.info('Link da tabela copiado');
            }}
          >
            <Share2Icon className="size-4" />
            <span>Compartilhar</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className={cn(
              'inline-flex space-x-1 w-full cursor-pointer',
              !table.trashed && 'hidden',
              !permission.can('REMOVE_TABLE') && 'hidden',
            )}
            onClick={() => hardDeleteTriggerRef.current?.click()}
          >
            <TrashIcon className="size-4" />
            <span>Excluir</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className={cn(
              'inline-flex space-x-1 w-full cursor-pointer',
              !table.trashed && 'hidden',
              !permission.can('UPDATE_TABLE') && 'hidden',
            )}
            onClick={() => tableRemoveFromTrashButtonRef.current?.click()}
          >
            <ArchiveRestoreIcon className="size-4" />
            <span>Restaurar</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className={cn(
              'inline-flex space-x-1 w-full cursor-pointer',
              table.trashed && 'hidden',
              !permission.can('REMOVE_TABLE') && 'hidden',
            )}
            onClick={() => tableSendToTrashButtonRef.current?.click()}
          >
            <TrashIcon className="size-4" />
            <span>Excluir</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PermanentDeleteConfirmDialog
        ref={hardDeleteTriggerRef}
        title="Excluir tabela permanentemente"
        description="Essa ação é irreversível. A tabela será excluída permanentemente e não poderá ser recuperada."
        itemsCount={1}
        isPending={hardDelete.isPending}
        onConfirm={(close) => {
          hardDelete.mutateAsync(undefined, { onSuccess: close });
        }}
        testId="delete-table-dialog"
      />
      <ActionDialog
        ref={tableRemoveFromTrashButtonRef}
        config={{
          mutationFn: async function () {
            await API.patch('/tables/'.concat(table.slug).concat('/restore'));
          },
          invalidateKeys: [
            queryKeys.tables.detail(table.slug),
            queryKeys.tables.lists(),
          ],
          toast: {
            title: 'Tabela restaurada!',
            description: 'A tabela foi restaurada da lixeira',
          },
          errorContext: 'Erro ao restaurar tabela da lixeira',
          title: 'Restaurar tabela da lixeira',
          description:
            'Ao confirmar essa ação, a tabela será restaurada da lixeira',
          testId: 'restore-table-dialog',
          confirmTestId: 'restore-table-confirm-btn',
        }}
      />
      <ActionDialog
        ref={tableSendToTrashButtonRef}
        config={{
          mutationFn: async function () {
            await API.patch('/tables/'.concat(table.slug).concat('/trash'));
          },
          invalidateKeys: [
            queryKeys.tables.detail(table.slug),
            queryKeys.tables.lists(),
          ],
          toast: {
            title: 'Tabela enviada para lixeira!',
            description: 'A tabela foi movida para a lixeira',
          },
          navigation: { to: '/tables', search: { page: 1, perPage: 50 } },
          errorContext: 'Erro ao enviar tabela para lixeira',
          title: 'Enviar tabela para a lixeira',
          description:
            'Ao confirmar essa ação, a tabela será enviada para a lixeira',
          testId: 'trash-table-dialog',
          confirmTestId: 'trash-table-confirm-btn',
        }}
      />
    </div>
  );
}

const columns: Array<ColumnDef<ITable>> = [
  {
    id: 'name',
    accessorKey: 'name',
    meta: { label: 'Tabela' },
    header: () => (
      <DataTableColumnHeader
        title="Tabela"
        orderKey="order-name"
        routeId={ROUTE_ID}
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-center space-x-2">
        <Avatar className="size-10 rounded-md border">
          <AvatarImage
            src={row.original.logo?.url}
            alt={`Logo da tabela ${row.original.name}`}
            className="object-cover"
          />
          <AvatarFallback className="rounded-md">
            <ImageOffIcon className="size-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <span className="truncate font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    id: 'slug',
    accessorKey: 'slug',
    meta: { label: 'Link (slug)' },
    header: () => (
      <DataTableColumnHeader
        title="Link (slug)"
        orderKey="order-link"
        routeId={ROUTE_ID}
      />
    ),
    cell: ({ getValue }): React.ReactElement => {
      const slug = getValue<string>();
      return (
        <div className="flex items-center space-x-1">
          <code className="text-sm text-muted-foreground">/{slug}</code>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={(e) => {
              e.stopPropagation();
              const url = `${window.location.origin}/tables/${slug}`;
              navigator.clipboard.writeText(url);
              toast.info('Link da tabela copiado');
            }}
          >
            <CopyIcon className="size-3" />
            <span className="sr-only">Copiar link</span>
          </Button>
        </div>
      );
    },
  },
  {
    id: 'owner',
    accessorFn: (row) => row.owner?.name,
    header: () => (
      <DataTableColumnHeader
        title="Criado por"
        orderKey="order-owner"
        routeId={ROUTE_ID}
      />
    ),
    meta: { label: 'Criado por' },
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">
        {getValue<string>()}
      </span>
    ),
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    meta: { label: 'Criado em' },
    header: () => (
      <DataTableColumnHeader
        title="Criado em"
        orderKey="order-created-at"
        routeId={ROUTE_ID}
      />
    ),
    cell: ({ getValue }): React.ReactElement => {
      const date = getValue<string | undefined>();
      return (
        <span className="text-sm text-muted-foreground">
          {formatDate(date)}
        </span>
      );
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    enableResizing: false,
    size: 80,
    cell: ({ row }) => <ActionsCell table={row.original} />,
  },
];

type Props = {
  data: Array<ITable>;
  toolbarPortal: HTMLDivElement | null;
  isTrashView: boolean;
};

export function TableTables({
  data,
  toolbarPortal,
  isTrashView,
}: Props): React.ReactElement {
  const sidebar = useSidebar();
  const router = useRouter();
  const permission = usePermission();
  const canRemoveTable = permission.can('REMOVE_TABLE');
  const canUpdateTable = permission.can('UPDATE_TABLE');
  const canSelect = canRemoveTable || canUpdateTable;

  const allColumns = React.useMemo(() => {
    const cols: Array<ColumnDef<ITable>> = [];

    if (canSelect) {
      cols.push({
        id: '_select',
        size: 40,
        enableResizing: false,
        enableHiding: false,
        header: ({ table: t }) => (
          <Checkbox
            checked={
              t.getIsAllPageRowsSelected() ||
              (t.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => t.toggleAllPageRowsSelected(!!value)}
            aria-label="Selecionar todas"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Selecionar linha"
            />
          </div>
        ),
      });
    }

    cols.push(...columns);
    return cols;
  }, [canSelect]);

  let leftPinning: Array<string> = [];
  if (canSelect) leftPinning = ['_select'];
  const table = useDataTable({
    data,
    columns: allColumns,
    getRowId: (row) => row._id,
    enableRowSelection: canSelect,
    enableColumnResizing: true,
    persistKey: 'admin:tables',
    initialColumnPinning: {
      left: leftPinning,
      right: ['actions'],
    },
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedIds = selectedRows.map((r) => r.id);

  const bulkTrash = useMutation({
    mutationFn: async function (ids: Array<string>) {
      const response = await API.patch<{ modified: number }>(
        '/tables/bulk-trash',
        { ids },
      );
      return response.data;
    },
    onSuccess(result) {
      table.resetRowSelection();
      QueryClient.invalidateQueries({
        queryKey: queryKeys.tables.lists(),
      });
      let message = `${result.modified} tabelas enviadas para lixeira!`;
      if (result.modified === 1) message = '1 tabela enviada para lixeira!';
      toast.success(message, {
        description: 'As tabelas foram movidas para a lixeira',
      });
    },
  });

  const bulkRestore = useMutation({
    mutationFn: async function (ids: Array<string>) {
      const response = await API.patch<{
        modified: number;
        skipped?: Array<string>;
      }>('/tables/bulk-restore', { ids });
      return response.data;
    },
    onSuccess(result) {
      table.resetRowSelection();
      QueryClient.invalidateQueries({
        queryKey: queryKeys.tables.lists(),
      });

      if (result.modified > 0) {
        let message = `${result.modified} tabelas restauradas!`;
        if (result.modified === 1) message = '1 tabela restaurada!';
        toast.success(message, {
          description: 'As tabelas foram restauradas da lixeira',
        });
      }

      if (result.skipped && result.skipped.length > 0) {
        let warnMessage = `${result.skipped.length} tabelas não foram restauradas`;
        if (result.skipped.length === 1) {
          warnMessage = '1 tabela não foi restaurada';
        }
        toast.warning(warnMessage, {
          description: `Já existe uma tabela ativa com o mesmo slug: ${result.skipped.join(', ')}. Renomeie ou exclua a tabela ativa antes de restaurar.`,
        });
      }
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async function (slugs: Array<string>) {
      let deleted = 0;
      for (const slug of slugs) {
        await API.delete('/tables/'.concat(slug));
        deleted++;
      }
      return { deleted };
    },
    onSuccess(result) {
      table.resetRowSelection();
      QueryClient.invalidateQueries({
        queryKey: queryKeys.tables.lists(),
      });
      let message = `${result.deleted} tabelas excluídas permanentemente!`;
      if (result.deleted === 1) message = '1 tabela excluída permanentemente!';
      toast.success(message);
    },
  });

  const selectedSlugs = selectedRows.map((r) => r.original.slug);

  return (
    <div data-test-id="tables-table">
      {toolbarPortal &&
        createPortal(<DataTableColumnToggle table={table} />, toolbarPortal)}
      <DataTable
        table={table}
        onRowClick={(t) => {
          sidebar.setOpen(false);
          router.navigate({
            to: '/tables/$slug',
            params: { slug: t.slug },
          });
        }}
      />

      {selectedCount > 0 && (
        <div className="sticky bottom-4 mx-auto flex w-fit max-w-[calc(100%-1rem)] flex-wrap items-center justify-center gap-3 rounded-lg border bg-background px-4 py-2 shadow-lg">
          <span className="text-sm font-medium">
            {selectedCount === 1 && '1 tabela selecionada'}
            {selectedCount !== 1 && `${selectedCount} tabelas selecionadas`}
          </span>
          {isTrashView && (
            <React.Fragment>
              {canUpdateTable && (
                <ConfirmDialog
                  asChild
                  title="Restaurar tabelas da lixeira"
                  description={`Ao confirmar essa ação, ${selectedCount} ${
                    (selectedCount === 1 && 'tabela será restaurada') ||
                    'tabelas serão restauradas'
                  } da lixeira.`}
                  confirmLabel="Confirmar"
                  isPending={bulkRestore.status === 'pending'}
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
              )}
              {canRemoveTable && (
                <PermanentDeleteConfirmDialog
                  asChild
                  title="Excluir tabelas permanentemente"
                  description="Essa ação é irreversível. As tabelas selecionadas serão excluídas permanentemente, incluindo seus campos e registros."
                  itemsCount={selectedCount}
                  isPending={bulkDelete.status === 'pending'}
                  onConfirm={(close) => {
                    bulkDelete.mutateAsync(selectedSlugs, { onSuccess: close });
                  }}
                  testId="bulk-delete-tables-dialog"
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
          {!isTrashView && canRemoveTable && (
            <ConfirmDialog
              asChild
              title="Enviar tabelas para a lixeira"
              description={`Ao confirmar essa ação, ${selectedCount} ${
                (selectedCount === 1 && 'tabela será enviada') ||
                'tabelas serão enviadas'
              } para a lixeira.`}
              confirmLabel="Confirmar"
              isPending={bulkTrash.status === 'pending'}
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
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => table.resetRowSelection()}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
