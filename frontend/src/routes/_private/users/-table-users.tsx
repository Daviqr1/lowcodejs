import { useRouter, useSearch } from '@tanstack/react-router';
import type { ColumnDef, Table } from '@tanstack/react-table';
import {
  ArchiveRestoreIcon,
  EllipsisIcon,
  EyeIcon,
  LoaderCircleIcon,
  PencilIcon,
  PowerIcon,
  TrashIcon,
} from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { BulkActionBar } from '@/components/common/bulk-action-bar';
import {
  DataTable,
  DataTableColumnToggle,
} from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { PermanentDeleteConfirmDialog } from '@/components/common/permanent-delete-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useSidebar } from '@/components/ui/sidebar';
import { useUserBulkDelete } from '@/hooks/tanstack-query/use-user-bulk-delete';
import { useUserBulkRestore } from '@/hooks/tanstack-query/use-user-bulk-restore';
import { useUserBulkTrash } from '@/hooks/tanstack-query/use-user-bulk-trash';
import { useUserBulkUpdate } from '@/hooks/tanstack-query/use-user-bulk-update';
import { useUserDelete } from '@/hooks/tanstack-query/use-user-delete';
import { useUserRemoveFromTrash } from '@/hooks/tanstack-query/use-user-remove-from-trash';
import { useUserSendToTrash } from '@/hooks/tanstack-query/use-user-send-to-trash';
import { useDataTable } from '@/hooks/use-data-table';
import {
  E_ROLE,
  E_USER_STATUS,
  USER_GROUP_MAPPER,
  USER_STATUS_MAPPER,
} from '@/lib/constant';
import { formatDate } from '@/lib/format-date';
import { handleApiError } from '@/lib/handle-api-error';
import type { IUser } from '@/lib/interfaces';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authentication';

const ROUTE_ID = '/_private/users/';

function getCheckboxState(
  allSelected: boolean,
  someSelected: boolean,
): boolean | 'indeterminate' {
  if (allSelected) return true;
  if (someSelected) return 'indeterminate';
  return false;
}

type ActionsCellProps = {
  user: IUser;
  isMaster: boolean;
  isPending: boolean;
  onSendToTrash: (user: IUser) => void;
  onRemoveFromTrash: (user: IUser) => void;
  onPermanentDelete: (user: IUser) => void;
  onView: (user: IUser) => void;
  onEdit: (user: IUser) => void;
};

function ActionsCell(props: ActionsCellProps): React.JSX.Element {
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
            onClick={() => props.onView(props.user)}
          >
            <EyeIcon className="size-4" />
            <span>Visualizar</span>
          </DropdownMenuItem>

          {!props.user.trashed && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full cursor-pointer"
              onClick={() => props.onEdit(props.user)}
            >
              <PencilIcon className="size-4" />
              <span>Editar</span>
            </DropdownMenuItem>
          )}

          {!props.user.trashed && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full cursor-pointer"
              disabled={props.isPending}
              onClick={() => props.onSendToTrash(props.user)}
            >
              <TrashIcon className="size-4" />
              <span>Enviar para lixeira</span>
            </DropdownMenuItem>
          )}

          {props.user.trashed && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full cursor-pointer"
              disabled={props.isPending}
              onClick={() => props.onRemoveFromTrash(props.user)}
            >
              <ArchiveRestoreIcon className="size-4" />
              <span>Restaurar</span>
            </DropdownMenuItem>
          )}

          {props.user.trashed && props.isMaster && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full cursor-pointer text-destructive focus:text-destructive"
              onClick={() => props.onPermanentDelete(props.user)}
            >
              <TrashIcon className="size-4" />
              <span>Excluir permanentemente</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: () => void;
  testId?: string;
};

function ConfirmDialog(props: ConfirmDialogProps): React.JSX.Element {
  return (
    <Dialog
      modal
      open={props.open}
      onOpenChange={props.onOpenChange}
    >
      <DialogContent
        className="py-4 px-6"
        data-test-id={props.testId}
      >
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="inline-flex w-full gap-2 justify-end pt-2">
          <DialogClose asChild>
            <Button
              variant="outline"
              disabled={props.isPending}
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={props.isPending}
            onClick={props.onConfirm}
          >
            {props.isPending && (
              <LoaderCircleIcon className="size-4 animate-spin" />
            )}
            {!props.isPending && <span>{props.confirmLabel}</span>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildColumns(params: {
  canTrash: boolean;
  isMaster: boolean;
  isPending: boolean;
  onSendToTrash: (user: IUser) => void;
  onRemoveFromTrash: (user: IUser) => void;
  onPermanentDelete: (user: IUser) => void;
  onView: (user: IUser) => void;
  onEdit: (user: IUser) => void;
}): Array<ColumnDef<IUser, unknown>> {
  const cols: Array<ColumnDef<IUser, unknown>> = [];

  if (params.canTrash) {
    cols.push({
      id: '_select',
      enableHiding: false,
      enableResizing: false,
      size: 40,
      header: ({ table }) => (
        <Checkbox
          checked={getCheckboxState(
            table.getIsAllPageRowsSelected(),
            table.getIsSomePageRowsSelected(),
          )}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selecionar todos"
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Selecionar usuário"
          />
        </div>
      ),
    });
  }

  cols.push(
    {
      id: 'name',
      accessorKey: 'name',
      meta: { label: 'Nome' },
      header: () => (
        <DataTableColumnHeader
          title="Nome"
          orderKey="order-name"
          routeId={ROUTE_ID}
        />
      ),
    },
    {
      id: 'email',
      accessorKey: 'email',
      meta: { label: 'E-mail' },
      header: () => (
        <DataTableColumnHeader
          title="E-mail"
          orderKey="order-email"
          routeId={ROUTE_ID}
        />
      ),
    },
    {
      id: 'group',
      accessorKey: 'group.slug',
      meta: { label: 'Grupo' },
      header: () => (
        <DataTableColumnHeader
          title="Grupo"
          orderKey="order-group"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }) => {
        const group = row.original.group;
        if (group.slug in USER_GROUP_MAPPER) {
          return USER_GROUP_MAPPER[
            group.slug as keyof typeof USER_GROUP_MAPPER
          ];
        }
        return group.slug;
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      meta: { label: 'Status' },
      header: () => (
        <DataTableColumnHeader
          title="Status"
          orderKey="order-status"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.ReactElement => {
        const status = row.original.status;
        return (
          <Badge
            variant="outline"
            className={cn(
              'font-semibold border-transparent',
              status === E_USER_STATUS.ACTIVE && 'bg-green-100 text-green-700',
              status === E_USER_STATUS.INACTIVE &&
                'bg-destructive/10 text-destructive',
            )}
          >
            {status in USER_STATUS_MAPPER &&
              USER_STATUS_MAPPER[status as keyof typeof USER_STATUS_MAPPER]}
            {!(status in USER_STATUS_MAPPER) && status}
          </Badge>
        );
      },
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
      cell: ({ row }): React.ReactElement => {
        const date = row.original.createdAt;
        return (
          <span className="text-sm text-muted-foreground">
            {formatDate(date)}
          </span>
        );
      },
    },
  );

  if (params.canTrash) {
    cols.push({
      id: '_actions',
      enableHiding: false,
      enableResizing: false,
      size: 60,
      cell: ({ row }) => (
        <ActionsCell
          user={row.original}
          isMaster={params.isMaster}
          isPending={params.isPending}
          onSendToTrash={params.onSendToTrash}
          onRemoveFromTrash={params.onRemoveFromTrash}
          onPermanentDelete={params.onPermanentDelete}
          onView={params.onView}
          onEdit={params.onEdit}
        />
      ),
    });
  }

  return cols;
}

interface Props {
  data: Array<IUser>;
  toolbarPortal: HTMLDivElement | null;
}

export function TableUsers({ data, toolbarPortal }: Props): React.JSX.Element {
  const sidebar = useSidebar();
  const router = useRouter();
  const auth = useAuthStore();
  const search = useSearch({ from: '/_private/users/' });

  const role = auth.user?.group?.slug;
  const isMaster = role === E_ROLE.MASTER;
  const canTrash = role === E_ROLE.MASTER || role === E_ROLE.ADMINISTRATOR;
  const isTrashView = search.trashed === true;

  const [singleTrashUser, setSingleTrashUser] = React.useState<IUser | null>(
    null,
  );
  const [singleRestoreUser, setSingleRestoreUser] =
    React.useState<IUser | null>(null);
  const [singleDeleteUser, setSingleDeleteUser] = React.useState<IUser | null>(
    null,
  );
  const [bulkTrashOpen, setBulkTrashOpen] = React.useState(false);
  const [bulkRestoreOpen, setBulkRestoreOpen] = React.useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  const tableRef = React.useRef<Table<IUser> | null>(null);

  const navigateToUser = React.useCallback(
    (userId: string) => {
      sidebar.setOpen(false);
      router.navigate({
        to: '/users/$userId',
        params: { userId },
      });
    },
    [sidebar, router],
  );

  const navigateToEditUser = React.useCallback(
    (userId: string) => {
      sidebar.setOpen(false);
      router.navigate({
        to: '/users/$userId',
        params: { userId },
        search: { mode: 'edit' },
      });
    },
    [sidebar, router],
  );

  const sendToTrash = useUserSendToTrash({
    onSuccess() {
      setSingleTrashUser(null);
      toast.success('Usuário enviado para lixeira!', {
        description: 'O usuário foi movido para a lixeira',
      });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao enviar usuário para lixeira' });
    },
  });

  const removeFromTrash = useUserRemoveFromTrash({
    onSuccess() {
      setSingleRestoreUser(null);
      toast.success('Usuário restaurado!', {
        description: 'O usuário foi restaurado da lixeira',
      });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao restaurar usuário' });
    },
  });

  const userDelete = useUserDelete({
    onSuccess() {
      setSingleDeleteUser(null);
      toast.success('Usuário excluído permanentemente!', {
        description: 'O usuário foi excluído permanentemente',
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao excluir usuário permanentemente',
      });
    },
  });

  const bulkTrash = useUserBulkTrash({
    onSuccess(result) {
      setBulkTrashOpen(false);
      tableRef.current?.resetRowSelection();
      const message =
        result.modified === 1
          ? '1 usuário enviado para lixeira!'
          : result.modified
              .toString()
              .concat(' usuários enviados para lixeira!');
      toast.success(message, {
        description: 'Os usuários foram movidos para a lixeira',
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao enviar usuários para lixeira',
      });
    },
  });

  const bulkRestore = useUserBulkRestore({
    onSuccess(result) {
      setBulkRestoreOpen(false);
      tableRef.current?.resetRowSelection();
      const message =
        result.modified === 1
          ? '1 usuário restaurado!'
          : result.modified.toString().concat(' usuários restaurados!');
      toast.success(message, {
        description: 'Os usuários foram restaurados da lixeira',
      });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao restaurar usuários' });
    },
  });

  const bulkDelete = useUserBulkDelete({
    onSuccess(result) {
      setBulkDeleteOpen(false);
      tableRef.current?.resetRowSelection();
      const message =
        result.deleted === 1
          ? '1 usuário excluído permanentemente!'
          : result.deleted
              .toString()
              .concat(' usuários excluídos permanentemente!');
      toast.success(message, {
        description: 'Os usuários foram excluídos permanentemente',
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao excluir usuários permanentemente',
      });
    },
  });

  const bulkUpdateStatus = useUserBulkUpdate({
    onSuccess(result) {
      tableRef.current?.resetRowSelection();
      const message =
        result.modified === 1
          ? '1 usuário atualizado!'
          : result.modified.toString().concat(' usuários atualizados!');
      toastSuccess(message, 'O status dos usuários foi alterado');
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao alterar o status dos usuários',
      });
    },
  });

  const isAnySinglePending =
    sendToTrash.isPending || removeFromTrash.isPending || userDelete.isPending;

  const columns = React.useMemo(
    () =>
      buildColumns({
        canTrash,
        isMaster,
        isPending: isAnySinglePending,
        onSendToTrash: (user) => setSingleTrashUser(user),
        onRemoveFromTrash: (user) => setSingleRestoreUser(user),
        onPermanentDelete: (user) => setSingleDeleteUser(user),
        onView: (user) => navigateToUser(user._id),
        onEdit: (user) => navigateToEditUser(user._id),
      }),
    [
      canTrash,
      isMaster,
      isAnySinglePending,
      navigateToUser,
      navigateToEditUser,
    ],
  );

  const leftPinning: Array<string> = [];
  if (canTrash) leftPinning.push('_select');

  const rightPinning: Array<string> = [];
  if (canTrash) rightPinning.push('_actions');

  const table = useDataTable({
    data,
    columns,
    getRowId: (row) => row._id,
    enableRowSelection: canTrash,
    persistKey: 'admin:users',
    initialColumnPinning: {
      left: leftPinning,
      right: rightPinning,
    },
  });

  React.useEffect(() => {
    tableRef.current = table;
  }, [table]);

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedIds = selectedRows.map((r) => r.id);

  return (
    <>
      {toolbarPortal &&
        createPortal(<DataTableColumnToggle table={table} />, toolbarPortal)}
      <DataTable
        data-test-id="users-table"
        table={table}
        onRowClick={(user) => {
          navigateToUser(user._id);
        }}
      />

      {selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          isTrashView={isTrashView}
          canDelete={isMaster}
          onClear={() => table.resetRowSelection()}
          onTrash={() => setBulkTrashOpen(true)}
          onRestore={() => setBulkRestoreOpen(true)}
          onDelete={() => setBulkDeleteOpen(true)}
          isTrashing={bulkTrash.isPending}
          isRestoring={bulkRestore.isPending}
          extraActions={
            <DropdownMenu
              dir="ltr"
              modal={false}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  data-test-id="bulk-user-status-btn"
                  disabled={bulkUpdateStatus.isPending}
                >
                  {bulkUpdateStatus.isPending ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <PowerIcon className="size-4" />
                  )}
                  <span>Alterar status</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Definir status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() =>
                    bulkUpdateStatus.mutate({
                      ids: selectedIds,
                      status: E_USER_STATUS.ACTIVE,
                    })
                  }
                >
                  <span>Ativar</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() =>
                    bulkUpdateStatus.mutate({
                      ids: selectedIds,
                      status: E_USER_STATUS.INACTIVE,
                    })
                  }
                >
                  <span>Desativar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      )}

      <ConfirmDialog
        open={singleTrashUser !== null}
        onOpenChange={(open) => {
          if (!open) setSingleTrashUser(null);
        }}
        title="Enviar usuário para a lixeira"
        description="Ao confirmar essa ação, o usuário será enviado para a lixeira."
        confirmLabel="Enviar para lixeira"
        isPending={sendToTrash.isPending}
        onConfirm={() => {
          if (!singleTrashUser) return;
          sendToTrash.mutate({ _id: singleTrashUser._id });
        }}
        testId="trash-user-dialog"
      />

      <ConfirmDialog
        open={singleRestoreUser !== null}
        onOpenChange={(open) => {
          if (!open) setSingleRestoreUser(null);
        }}
        title="Restaurar usuário da lixeira"
        description="Ao confirmar essa ação, o usuário será restaurado da lixeira."
        confirmLabel="Restaurar"
        isPending={removeFromTrash.isPending}
        onConfirm={() => {
          if (!singleRestoreUser) return;
          removeFromTrash.mutate({ _id: singleRestoreUser._id });
        }}
        testId="restore-user-dialog"
      />

      <PermanentDeleteConfirmDialog
        open={singleDeleteUser !== null}
        onOpenChange={(open) => {
          if (!open) setSingleDeleteUser(null);
        }}
        title="Excluir usuário permanentemente"
        description="Essa ação é irreversível. O usuário será excluído permanentemente e não poderá ser recuperado."
        itemsCount={1}
        isPending={userDelete.isPending}
        onConfirm={() => {
          if (!singleDeleteUser) return;
          userDelete.mutate({ _id: singleDeleteUser._id });
        }}
        testId="delete-user-dialog"
      />

      <ConfirmDialog
        open={bulkTrashOpen}
        onOpenChange={setBulkTrashOpen}
        title="Enviar usuários para a lixeira"
        description="Os usuários selecionados serão enviados para a lixeira."
        confirmLabel="Enviar para lixeira"
        isPending={bulkTrash.isPending}
        onConfirm={() => bulkTrash.mutate({ ids: selectedIds })}
        testId="bulk-trash-users-dialog"
      />

      <ConfirmDialog
        open={bulkRestoreOpen}
        onOpenChange={setBulkRestoreOpen}
        title="Restaurar usuários da lixeira"
        description="Os usuários selecionados serão restaurados da lixeira."
        confirmLabel="Restaurar"
        isPending={bulkRestore.isPending}
        onConfirm={() => bulkRestore.mutate({ ids: selectedIds })}
        testId="bulk-restore-users-dialog"
      />

      <PermanentDeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Excluir usuários permanentemente"
        description="Essa ação é irreversível. Os usuários selecionados serão excluídos permanentemente e não poderão ser recuperados."
        itemsCount={selectedCount}
        isPending={bulkDelete.isPending}
        onConfirm={() => bulkDelete.mutate({ ids: selectedIds })}
        testId="bulk-delete-users-dialog"
      />
    </>
  );
}
