import { useRouter, useSearch } from '@tanstack/react-router';
import type { ColumnDef, Table } from '@tanstack/react-table';
import {
  ArchiveRestoreIcon,
  EllipsisIcon,
  EyeIcon,
  LoaderCircleIcon,
  PencilIcon,
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
import { useGroupBulkDelete } from '@/hooks/tanstack-query/use-group-bulk-delete';
import { useGroupBulkRestore } from '@/hooks/tanstack-query/use-group-bulk-restore';
import { useGroupBulkTrash } from '@/hooks/tanstack-query/use-group-bulk-trash';
import { useGroupDelete } from '@/hooks/tanstack-query/use-group-delete';
import { useGroupReadList } from '@/hooks/tanstack-query/use-group-read-list';
import { useGroupRemoveFromTrash } from '@/hooks/tanstack-query/use-group-remove-from-trash';
import { useGroupSendToTrash } from '@/hooks/tanstack-query/use-group-send-to-trash';
import { useDataTable } from '@/hooks/use-data-table';
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import { E_ROLE, USER_GROUP_MAPPER } from '@/lib/constant';
import { handleApiError } from '@/lib/handle-api-error';
import type { IGroup, Merge } from '@/lib/interfaces';
import { isMaster } from '@/lib/permission';
import { useAuthStore } from '@/stores/authentication';

const ROUTE_ID = '/_private/groups/';

// Alias com index de string: permite consultar o mapper (as const) por slug
// dinamico sem assertion `keyof`.
const GROUP_LABELS: Record<string, string> = USER_GROUP_MAPPER;

const SYSTEM_GROUP_SLUGS = new Set<string>([
  E_ROLE.MASTER,
  E_ROLE.ADMINISTRATOR,
  E_ROLE.MANAGER,
  E_ROLE.REGISTERED,
]);

function getCheckboxState(
  allSelected: boolean,
  someSelected: boolean,
): boolean | 'indeterminate' {
  if (allSelected) return true;
  if (someSelected) return 'indeterminate';
  return false;
}

type ActionsCellProps = {
  group: IGroup;
  isMaster: boolean;
  isPending: boolean;
  onSendToTrash: (group: IGroup) => void;
  onRemoveFromTrash: (group: IGroup) => void;
  onPermanentDelete: (group: IGroup) => void;
  onView: (group: IGroup) => void;
  onEdit: (group: IGroup) => void;
};

function ActionsCell(props: ActionsCellProps): React.JSX.Element {
  const isSystemGroup = SYSTEM_GROUP_SLUGS.has(props.group.slug);

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
            onClick={() => props.onView(props.group)}
          >
            <EyeIcon className="size-4" />
            <span>Visualizar</span>
          </DropdownMenuItem>

          {!props.group.trashed && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full cursor-pointer"
              onClick={() => props.onEdit(props.group)}
            >
              <PencilIcon className="size-4" />
              <span>Editar</span>
            </DropdownMenuItem>
          )}

          {!props.group.trashed && !isSystemGroup && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full cursor-pointer"
              disabled={props.isPending}
              onClick={() => props.onSendToTrash(props.group)}
            >
              <TrashIcon className="size-4" />
              <span>Enviar para lixeira</span>
            </DropdownMenuItem>
          )}

          {props.group.trashed && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full cursor-pointer"
              disabled={props.isPending}
              onClick={() => props.onRemoveFromTrash(props.group)}
            >
              <ArchiveRestoreIcon className="size-4" />
              <span>Restaurar</span>
            </DropdownMenuItem>
          )}

          {props.group.trashed && props.isMaster && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full cursor-pointer text-destructive focus:text-destructive"
              onClick={() => props.onPermanentDelete(props.group)}
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
        <DialogClose
          ref={closeRef}
          className="hidden"
        />
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="inline-flex w-full gap-2 justify-end pt-2">
          <DialogClose asChild>
            <Button
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

function isSystemGroupRow(group: IGroup): boolean {
  return SYSTEM_GROUP_SLUGS.has(group.slug);
}

function buildColumns(params: {
  canTrash: boolean;
  isMaster: boolean;
  isPending: boolean;
  onSendToTrash: (group: IGroup) => void;
  onRemoveFromTrash: (group: IGroup) => void;
  onPermanentDelete: (group: IGroup) => void;
  onView: (group: IGroup) => void;
  onEdit: (group: IGroup) => void;
}): Array<ColumnDef<IGroup, unknown>> {
  const cols: Array<ColumnDef<IGroup, unknown>> = [];

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
      cell: ({ row }) => {
        if (isSystemGroupRow(row.original)) {
          return null;
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Selecionar grupo"
            />
          </div>
        );
      },
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
      cell: ({ row }): React.ReactElement => {
        const group = row.original;
        return <>{GROUP_LABELS[group.slug] || group.name}</>;
      },
    },
    {
      id: 'description',
      accessorKey: 'description',
      meta: { label: 'Descrição' },
      header: () => (
        <DataTableColumnHeader
          title="Descrição"
          orderKey="order-description"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }) => (
        <span className="truncate max-w-xs block">
          {row.original.description || 'N/A'}
        </span>
      ),
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
          group={row.original}
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
  data: Array<IGroup>;
  toolbarPortal: HTMLDivElement | null;
};

export function TableGroups({ data, toolbarPortal }: Props): React.JSX.Element {
  const sidebar = useSidebar();
  const router = useRouter();
  const auth = useAuthStore();
  const search = useSearch({ from: '/_private/groups/' });

  // Hard-delete/trash de grupos é MASTER-only, resolvido pelo fecho de grupos.
  const groups = useGroupReadList();
  const master = isMaster(auth.user, groups.data ?? []);
  const canTrash = master;
  const isTrashView = search.trashed === true;

  const [singleTrashTarget, setSingleTrashTarget] = React.useState<{
    group: IGroup;
    nonce: number;
  } | null>(null);
  const [singleRestoreTarget, setSingleRestoreTarget] = React.useState<{
    group: IGroup;
    nonce: number;
  } | null>(null);
  const singleTrashTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const singleRestoreTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const bulkTrashTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const bulkRestoreTriggerRef = React.useRef<HTMLButtonElement | null>(null);

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

  const requestSingleTrash = React.useCallback((group: IGroup) => {
    setSingleTrashTarget((previous) => ({
      group,
      nonce: (previous?.nonce ?? 0) + 1,
    }));
  }, []);
  const requestSingleRestore = React.useCallback((group: IGroup) => {
    setSingleRestoreTarget((previous) => ({
      group,
      nonce: (previous?.nonce ?? 0) + 1,
    }));
  }, []);

  // hard delete singular (shared PermanentDelete): alvo dinâmico via ref + nonce.
  const [singleDeleteTarget, setSingleDeleteTarget] = React.useState<{
    group: IGroup;
    nonce: number;
  } | null>(null);
  const singleDeleteTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const bulkDeleteTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(
    function openSingleDelete() {
      if (singleDeleteTarget) singleDeleteTriggerRef.current?.click();
    },
    [singleDeleteTarget],
  );

  const tableRef = React.useRef<Table<IGroup> | null>(null);

  const navigateToGroup = React.useCallback(
    (groupId: string) => {
      sidebar.setOpen(false);
      router.navigate({
        to: '/groups/$groupId',
        params: { groupId },
      });
    },
    [sidebar, router],
  );

  const navigateToEditGroup = React.useCallback(
    (groupId: string) => {
      sidebar.setOpen(false);
      router.navigate({
        to: '/groups/$groupId',
        params: { groupId },
        search: { mode: 'edit' },
      });
    },
    [sidebar, router],
  );

  const sendToTrash = useGroupSendToTrash({
    onSuccess() {
      toast.success('Grupo enviado para lixeira!', {
        description: 'O grupo foi movido para a lixeira',
      });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao enviar grupo para lixeira' });
    },
  });

  const removeFromTrash = useGroupRemoveFromTrash({
    onSuccess() {
      toast.success('Grupo restaurado!', {
        description: 'O grupo foi restaurado da lixeira',
      });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao restaurar grupo' });
    },
  });

  const groupDelete = useGroupDelete({
    onSuccess() {
      toast.success('Grupo excluído permanentemente!', {
        description: 'O grupo foi excluído permanentemente',
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao excluir grupo permanentemente',
      });
    },
  });

  const bulkTrash = useGroupBulkTrash({
    onSuccess(result) {
      tableRef.current?.resetRowSelection();
      let message = result.modified
        .toString()
        .concat(' grupos enviados para lixeira!');
      if (result.modified === 1) message = '1 grupo enviado para lixeira!';
      toast.success(message, {
        description: 'Os grupos foram movidos para a lixeira',
      });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao enviar grupos para lixeira' });
    },
  });

  const bulkRestore = useGroupBulkRestore({
    onSuccess(result) {
      tableRef.current?.resetRowSelection();
      let message = result.modified.toString().concat(' grupos restaurados!');
      if (result.modified === 1) message = '1 grupo restaurado!';
      toast.success(message, {
        description: 'Os grupos foram restaurados da lixeira',
      });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao restaurar grupos' });
    },
  });

  const bulkDelete = useGroupBulkDelete({
    onSuccess(result) {
      tableRef.current?.resetRowSelection();
      let message = result.deleted
        .toString()
        .concat(' grupos excluídos permanentemente!');
      if (result.deleted === 1) message = '1 grupo excluído permanentemente!';
      toast.success(message, {
        description: 'Os grupos foram excluídos permanentemente',
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao excluir grupos permanentemente',
      });
    },
  });

  const isAnySinglePending =
    sendToTrash.isPending || removeFromTrash.isPending || groupDelete.isPending;

  const columns = React.useMemo(
    () =>
      buildColumns({
        canTrash,
        isMaster: master,
        isPending: isAnySinglePending,
        onSendToTrash: (group) => requestSingleTrash(group),
        onRemoveFromTrash: (group) => requestSingleRestore(group),
        onPermanentDelete: (group) =>
          setSingleDeleteTarget((previous) => ({
            group,
            nonce: (previous?.nonce ?? 0) + 1,
          })),
        onView: (group) => navigateToGroup(group._id),
        onEdit: (group) => navigateToEditGroup(group._id),
      }),
    [
      canTrash,
      master,
      isAnySinglePending,
      navigateToGroup,
      navigateToEditGroup,
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
    enableRowSelection: (row) => canTrash && !isSystemGroupRow(row.original),
    persistKey: 'admin:groups',
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
        data-test-id="groups-table"
        table={table}
        onRowClick={(group) => {
          navigateToGroup(group._id);
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
        />
      )}

      {singleTrashTarget && (
        <ConfirmDialog
          key={singleTrashTarget.nonce}
          ref={singleTrashTriggerRef}
          title="Enviar grupo para a lixeira"
          description="Ao confirmar essa ação, o grupo será enviado para a lixeira."
          confirmLabel="Enviar para lixeira"
          isPending={sendToTrash.isPending}
          onConfirm={(close) => {
            sendToTrash.mutateAsync(
              { _id: singleTrashTarget.group._id },
              { onSuccess: close },
            );
          }}
          testId="trash-group-dialog"
        />
      )}

      {singleRestoreTarget && (
        <ConfirmDialog
          key={singleRestoreTarget.nonce}
          ref={singleRestoreTriggerRef}
          title="Restaurar grupo da lixeira"
          description="Ao confirmar essa ação, o grupo será restaurado da lixeira."
          confirmLabel="Restaurar"
          isPending={removeFromTrash.isPending}
          onConfirm={(close) => {
            removeFromTrash.mutateAsync(
              { _id: singleRestoreTarget.group._id },
              { onSuccess: close },
            );
          }}
          testId="restore-group-dialog"
        />
      )}

      {singleDeleteTarget && (
        <PermanentDeleteConfirmDialog
          key={singleDeleteTarget.nonce}
          ref={singleDeleteTriggerRef}
          title="Excluir grupo permanentemente"
          description="Essa ação é irreversível. O grupo será excluído permanentemente e não poderá ser recuperado."
          itemsCount={1}
          isPending={groupDelete.isPending}
          onConfirm={(close) => {
            groupDelete.mutateAsync(
              { _id: singleDeleteTarget.group._id },
              { onSuccess: close },
            );
          }}
          testId="delete-group-dialog"
        />
      )}

      <ConfirmDialog
        ref={bulkTrashTriggerRef}
        title="Enviar grupos para a lixeira"
        description="Os grupos selecionados serão enviados para a lixeira."
        confirmLabel="Enviar para lixeira"
        isPending={bulkTrash.isPending}
        onConfirm={(close) => {
          bulkTrash.mutateAsync({ ids: selectedIds }, { onSuccess: close });
        }}
        testId="bulk-trash-groups-dialog"
      />

      <ConfirmDialog
        ref={bulkRestoreTriggerRef}
        title="Restaurar grupos da lixeira"
        description="Os grupos selecionados serão restaurados da lixeira."
        confirmLabel="Restaurar"
        isPending={bulkRestore.isPending}
        onConfirm={(close) => {
          bulkRestore.mutateAsync({ ids: selectedIds }, { onSuccess: close });
        }}
        testId="bulk-restore-groups-dialog"
      />

      <PermanentDeleteConfirmDialog
        ref={bulkDeleteTriggerRef}
        title="Excluir grupos permanentemente"
        description="Essa ação é irreversível. Os grupos selecionados serão excluídos permanentemente e não poderão ser recuperados."
        itemsCount={selectedCount}
        isPending={bulkDelete.isPending}
        onConfirm={(close) => {
          bulkDelete.mutateAsync({ ids: selectedIds }, { onSuccess: close });
        }}
        testId="bulk-delete-groups-dialog"
      />
    </>
  );
}
