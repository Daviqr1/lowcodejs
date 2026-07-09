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
  DialogTrigger,
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
import { useGroupReadList } from '@/hooks/tanstack-query/use-group-read-list';
import { useUserBulkDelete } from '@/hooks/tanstack-query/use-user-bulk-delete';
import { useUserBulkRestore } from '@/hooks/tanstack-query/use-user-bulk-restore';
import { useUserBulkTrash } from '@/hooks/tanstack-query/use-user-bulk-trash';
import { useUserBulkUpdate } from '@/hooks/tanstack-query/use-user-bulk-update';
import { useUserDelete } from '@/hooks/tanstack-query/use-user-delete';
import { useUserRemoveFromTrash } from '@/hooks/tanstack-query/use-user-remove-from-trash';
import { useUserSendToTrash } from '@/hooks/tanstack-query/use-user-send-to-trash';
import { useDataTable } from '@/hooks/use-data-table';
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import {
  E_USER_STATUS,
  USER_GROUP_MAPPER,
  USER_STATUS_MAPPER,
} from '@/lib/constant';
import { formatDate } from '@/lib/format-date';
import { handleApiError } from '@/lib/handle-api-error';
import type { IUser, Merge } from '@/lib/interfaces';
import { isMaster, isPrivileged } from '@/lib/permission';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authentication';

const ROUTE_ID = '/_private/users/';

// Aliases com index de string: consultam os mappers (as const) por slug/status
// dinamico sem assertion `keyof`.
const GROUP_LABELS: Record<string, string> = USER_GROUP_MAPPER;
const STATUS_LABELS: Record<string, string> = USER_STATUS_MAPPER;

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

type ConfirmDialogProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  {
    title: string;
    description: string;
    confirmLabel: string;
    isPending: boolean;
    onConfirm: (close: () => void) => void;
    testId?: string;
  }
>;

function ConfirmDialog({
  ref,
  title,
  description,
  confirmLabel,
  isPending,
  onConfirm,
  testId,
  ...rest
}: ConfirmDialogProps): React.JSX.Element {
  const { closeRef, close } = useDismissableDialog();

  return (
    <Dialog>
      <DialogTrigger
        {...rest}
        ref={ref}
      />
      <DialogContent
        className="py-4 px-6"
        data-test-id={testId}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="inline-flex w-full gap-2 justify-end pt-2">
          <DialogClose asChild>
            <Button
              ref={closeRef}
              variant="outline"
              disabled={isPending}
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (isPending) return;
              onConfirm(close);
            }}
          >
            {isPending && <LoaderCircleIcon className="size-4 animate-spin" />}
            {!isPending && <span>{confirmLabel}</span>}
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
        return GROUP_LABELS[group.slug] || group.slug;
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
            {STATUS_LABELS[status] || status}
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

type Props = {
  data: Array<IUser>;
  toolbarPortal: HTMLDivElement | null;
};

export function TableUsers({ data, toolbarPortal }: Props): React.JSX.Element {
  const sidebar = useSidebar();
  const router = useRouter();
  const auth = useAuthStore();
  const search = useSearch({ from: '/_private/users/' });

  // Hard-delete é MASTER-only; trash/restore libera para privilegiados. Ambos
  // resolvidos pelo fecho de grupos (não apenas o grupo principal).
  const groups = useGroupReadList();
  const master = isMaster(auth.user, groups.data ?? []);
  const canTrash = isPrivileged(auth.user, groups.data ?? []);
  const isTrashView = search.trashed === true;

  // Confirms singular (trash/restore) e hard delete: alvo dinâmico via ref+nonce.
  const [singleTrashTarget, setSingleTrashTarget] = React.useState<{
    user: IUser;
    nonce: number;
  } | null>(null);
  const [singleRestoreTarget, setSingleRestoreTarget] = React.useState<{
    user: IUser;
    nonce: number;
  } | null>(null);
  const [singleDeleteTarget, setSingleDeleteTarget] = React.useState<{
    user: IUser;
    nonce: number;
  } | null>(null);
  const singleTrashTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const singleRestoreTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const singleDeleteTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const bulkTrashTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const bulkRestoreTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const bulkDeleteTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(
    function openSingleTrash() {
      if (singleTrashTarget) singleTrashTriggerRef.current?.click();
    },
    [singleTrashTarget],
  );
  React.useEffect(
    function openSingleRestore() {
      if (singleRestoreTarget) singleRestoreTriggerRef.current?.click();
    },
    [singleRestoreTarget],
  );
  React.useEffect(
    function openSingleDelete() {
      if (singleDeleteTarget) singleDeleteTriggerRef.current?.click();
    },
    [singleDeleteTarget],
  );

  const requestSingleTrash = React.useCallback((user: IUser) => {
    setSingleTrashTarget((previous) => ({
      user,
      nonce: (previous?.nonce ?? 0) + 1,
    }));
  }, []);
  const requestSingleRestore = React.useCallback((user: IUser) => {
    setSingleRestoreTarget((previous) => ({
      user,
      nonce: (previous?.nonce ?? 0) + 1,
    }));
  }, []);

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
      tableRef.current?.resetRowSelection();
      let message = result.modified
        .toString()
        .concat(' usuários enviados para lixeira!');
      if (result.modified === 1) message = '1 usuário enviado para lixeira!';
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
      tableRef.current?.resetRowSelection();
      let message = result.modified.toString().concat(' usuários restaurados!');
      if (result.modified === 1) message = '1 usuário restaurado!';
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
      tableRef.current?.resetRowSelection();
      let message = result.deleted
        .toString()
        .concat(' usuários excluídos permanentemente!');
      if (result.deleted === 1) message = '1 usuário excluído permanentemente!';
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
      let message = result.modified.toString().concat(' usuários atualizados!');
      if (result.modified === 1) message = '1 usuário atualizado!';
      toast.success(message, {
        description: 'O status dos usuários foi alterado',
      });
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
        isMaster: master,
        isPending: isAnySinglePending,
        onSendToTrash: (user) => requestSingleTrash(user),
        onRemoveFromTrash: (user) => requestSingleRestore(user),
        onPermanentDelete: (user) =>
          setSingleDeleteTarget((previous) => ({
            user,
            nonce: (previous?.nonce ?? 0) + 1,
          })),
        onView: (user) => navigateToUser(user._id),
        onEdit: (user) => navigateToEditUser(user._id),
      }),
    [canTrash, master, isAnySinglePending, navigateToUser, navigateToEditUser],
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
          canDelete={master}
          onClear={() => table.resetRowSelection()}
          onTrash={() => bulkTrashTriggerRef.current?.click()}
          onRestore={() => bulkRestoreTriggerRef.current?.click()}
          onDelete={() => bulkDeleteTriggerRef.current?.click()}
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
                  {bulkUpdateStatus.isPending && (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  )}
                  {!bulkUpdateStatus.isPending && (
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

      {singleTrashTarget && (
        <ConfirmDialog
          key={singleTrashTarget.nonce}
          ref={singleTrashTriggerRef}
          title="Enviar usuário para a lixeira"
          description="Ao confirmar essa ação, o usuário será enviado para a lixeira."
          confirmLabel="Enviar para lixeira"
          isPending={sendToTrash.isPending}
          onConfirm={(close) => {
            sendToTrash.mutateAsync(
              { _id: singleTrashTarget.user._id },
              { onSuccess: close },
            );
          }}
          testId="trash-user-dialog"
        />
      )}

      {singleRestoreTarget && (
        <ConfirmDialog
          key={singleRestoreTarget.nonce}
          ref={singleRestoreTriggerRef}
          title="Restaurar usuário da lixeira"
          description="Ao confirmar essa ação, o usuário será restaurado da lixeira."
          confirmLabel="Restaurar"
          isPending={removeFromTrash.isPending}
          onConfirm={(close) => {
            removeFromTrash.mutateAsync(
              { _id: singleRestoreTarget.user._id },
              { onSuccess: close },
            );
          }}
          testId="restore-user-dialog"
        />
      )}

      {singleDeleteTarget && (
        <PermanentDeleteConfirmDialog
          key={singleDeleteTarget.nonce}
          ref={singleDeleteTriggerRef}
          title="Excluir usuário permanentemente"
          description="Essa ação é irreversível. O usuário será excluído permanentemente e não poderá ser recuperado."
          itemsCount={1}
          isPending={userDelete.isPending}
          onConfirm={(close) => {
            userDelete.mutateAsync(
              { _id: singleDeleteTarget.user._id },
              { onSuccess: close },
            );
          }}
          testId="delete-user-dialog"
        />
      )}

      <ConfirmDialog
        ref={bulkTrashTriggerRef}
        title="Enviar usuários para a lixeira"
        description="Os usuários selecionados serão enviados para a lixeira."
        confirmLabel="Enviar para lixeira"
        isPending={bulkTrash.isPending}
        onConfirm={(close) => {
          bulkTrash.mutateAsync({ ids: selectedIds }, { onSuccess: close });
        }}
        testId="bulk-trash-users-dialog"
      />

      <ConfirmDialog
        ref={bulkRestoreTriggerRef}
        title="Restaurar usuários da lixeira"
        description="Os usuários selecionados serão restaurados da lixeira."
        confirmLabel="Restaurar"
        isPending={bulkRestore.isPending}
        onConfirm={(close) => {
          bulkRestore.mutateAsync({ ids: selectedIds }, { onSuccess: close });
        }}
        testId="bulk-restore-users-dialog"
      />

      <PermanentDeleteConfirmDialog
        ref={bulkDeleteTriggerRef}
        title="Excluir usuários permanentemente"
        description="Essa ação é irreversível. Os usuários selecionados serão excluídos permanentemente e não poderão ser recuperados."
        itemsCount={selectedCount}
        isPending={bulkDelete.isPending}
        onConfirm={(close) => {
          bulkDelete.mutateAsync({ ids: selectedIds }, { onSuccess: close });
        }}
        testId="bulk-delete-users-dialog"
      />
    </>
  );
}
