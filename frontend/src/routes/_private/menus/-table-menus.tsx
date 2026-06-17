import { useRouter, useSearch } from '@tanstack/react-router';
import type { ColumnDef, Table } from '@tanstack/react-table';
import {
  ArchiveRestoreIcon,
  CornerDownRightIcon,
  EllipsisIcon,
  EyeIcon,
  HouseIcon,
  LoaderCircleIcon,
  PencilIcon,
  TrashIcon,
} from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { ActionDialog } from '@/components/common/action-dialog';
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
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useMenuBulkDelete } from '@/hooks/tanstack-query/use-menu-bulk-delete';
import { useMenuBulkRestore } from '@/hooks/tanstack-query/use-menu-bulk-restore';
import { useMenuBulkTrash } from '@/hooks/tanstack-query/use-menu-bulk-trash';
import { useUpdateMenu } from '@/hooks/tanstack-query/use-menu-update';
import { useDataTable } from '@/hooks/use-data-table';
import { API } from '@/lib/api';
import { E_MENU_ITEM_TYPE, E_ROLE } from '@/lib/constant';
import { formatDate } from '@/lib/format-date';
import { handleApiError } from '@/lib/handle-api-error';
import type { IMenu } from '@/lib/interfaces';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authentication';

const ROUTE_ID = '/_private/menus/';

const TypeMapper = {
  [E_MENU_ITEM_TYPE.PAGE]: 'Página',
  [E_MENU_ITEM_TYPE.TABLE]: 'Tabela',
  [E_MENU_ITEM_TYPE.FORM]: 'Formulário',
  [E_MENU_ITEM_TYPE.EXTERNAL]: 'Link Externo',
  [E_MENU_ITEM_TYPE.SEPARATOR]: 'Separador',
};

function hasParent(menu: IMenu): boolean {
  return Boolean(menu.parent);
}

function getParentId(menu: IMenu): string | null {
  if (!menu.parent) return null;
  if (typeof menu.parent === 'string') return menu.parent;
  return menu.parent._id;
}

function sortByPosition(
  menus: Array<IMenu>,
  direction: 'asc' | 'desc' = 'asc',
): Array<IMenu> {
  return [...menus].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return direction === 'asc' ? orderDiff : -orderDiff;
    return a.name.localeCompare(b.name);
  });
}

function buildMenuPositionLabels(
  data: Array<IMenu>,
  direction: 'asc' | 'desc' = 'asc',
): Map<string, string> {
  const menuIds = new Set(data.map((menu) => menu._id));
  const childrenByParent = new Map<string | null, Array<IMenu>>();

  for (const menu of data) {
    const parentId = getParentId(menu);
    const groupKey = parentId && menuIds.has(parentId) ? parentId : null;
    const siblings = childrenByParent.get(groupKey) ?? [];

    siblings.push(menu);
    childrenByParent.set(groupKey, siblings);
  }

  const labels = new Map<string, string>();

  function appendLabels(parentId: string | null, parentLabel?: string): void {
    const siblings = sortByPosition(
      childrenByParent.get(parentId) ?? [],
      direction,
    );

    siblings.forEach((menu, index) => {
      const label = parentLabel
        ? parentLabel.concat('.').concat(String(index + 1))
        : String(menu.order ?? index);

      labels.set(menu._id, label);
      appendLabels(menu._id, label);
    });
  }

  appendLabels(null);

  return labels;
}

function sortMenuDataByHierarchy(
  data: Array<IMenu>,
  direction: 'asc' | 'desc' = 'asc',
): Array<IMenu> {
  const menuIds = new Set(data.map((menu) => menu._id));
  const childrenByParent = new Map<string | null, Array<IMenu>>();
  const ordered: Array<IMenu> = [];

  for (const menu of data) {
    const parentId = getParentId(menu);
    const groupKey = parentId && menuIds.has(parentId) ? parentId : null;
    const siblings = childrenByParent.get(groupKey) ?? [];

    siblings.push(menu);
    childrenByParent.set(groupKey, siblings);
  }

  function appendChildren(parentId: string | null): void {
    const siblings = sortByPosition(
      childrenByParent.get(parentId) ?? [],
      direction,
    );

    for (const menu of siblings) {
      ordered.push(menu);
      appendChildren(menu._id);
    }
  }

  appendChildren(null);

  return ordered;
}

function getCheckboxState(
  allSelected: boolean,
  someSelected: boolean,
): boolean | 'indeterminate' {
  if (allSelected) return true;
  if (someSelected) return 'indeterminate';
  return false;
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

type ActionsCellProps = {
  menu: IMenu;
  isMaster: boolean;
  onPermanentDelete: (menu: IMenu) => void;
};

function ActionsCell(props: ActionsCellProps): React.JSX.Element {
  const sidebar = useSidebar();
  const router = useRouter();
  const menuRestoreButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const menuSendToTrashButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const setInitialMutation = useUpdateMenu({
    onSuccess() {
      toast.success('Página inicial atualizada', {
        description: 'Este menu será carregado ao acessar o sistema',
      });
      router.invalidate();
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao definir menu como página inicial',
      });
    },
  });

  const setAsInitial = (): void => {
    if (
      props.menu.isInitial ||
      props.menu.type === E_MENU_ITEM_TYPE.SEPARATOR ||
      setInitialMutation.status === 'pending'
    )
      return;

    setInitialMutation.mutate({
      _id: props.menu._id,
      name: props.menu.name,
      type: props.menu.type,
      parent: getParentId(props.menu),
      table: props.menu.table?._id ?? null,
      html: props.menu.html ?? null,
      url: props.menu.url ?? null,
      order: props.menu.order ?? 0,
      isInitial: true,
    });
  };

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
            onClick={() => {
              sidebar.setOpen(false);
              router.navigate({
                to: '/menus/$menuId',
                params: { menuId: props.menu._id },
              });
            }}
          >
            <EyeIcon className="size-4" />
            <span>Visualizar</span>
          </DropdownMenuItem>

          {!props.menu.trashed && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full cursor-pointer"
              onClick={() => {
                sidebar.setOpen(false);
                router.navigate({
                  to: '/menus/$menuId',
                  params: { menuId: props.menu._id },
                  search: { mode: 'edit' },
                });
              }}
            >
              <PencilIcon className="size-4" />
              <span>Editar</span>
            </DropdownMenuItem>
          )}

          {!props.menu.trashed &&
            props.menu.type !== E_MENU_ITEM_TYPE.SEPARATOR && (
              <DropdownMenuItem
                disabled={
                  props.menu.isInitial ||
                  setInitialMutation.status === 'pending'
                }
                className="inline-flex space-x-1 w-full cursor-pointer"
                onClick={setAsInitial}
              >
                <HouseIcon className="size-4" />
                <span>
                  {props.menu.isInitial
                    ? 'Página inicial atual'
                    : 'Definir como página inicial'}
                </span>
              </DropdownMenuItem>
            )}

          {props.menu.trashed && props.isMaster && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full cursor-pointer text-destructive focus:text-destructive"
              onClick={() => props.onPermanentDelete(props.menu)}
            >
              <TrashIcon className="size-4" />
              <span>Excluir permanentemente</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            className={cn(
              'inline-flex space-x-1 w-full cursor-pointer',
              !props.menu.trashed && 'hidden',
            )}
            onClick={() => menuRestoreButtonRef.current?.click()}
          >
            <ArchiveRestoreIcon className="size-4" />
            <span>Restaurar</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className={cn(
              'inline-flex space-x-1 w-full cursor-pointer',
              props.menu.trashed && 'hidden',
            )}
            onClick={() => menuSendToTrashButtonRef.current?.click()}
          >
            <TrashIcon className="size-4" />
            <span>Enviar para lixeira</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ActionDialog
        ref={menuRestoreButtonRef}
        config={{
          mutationFn: async function () {
            await API.patch('/menu/'.concat(props.menu._id).concat('/restore'));
          },
          invalidateKeys: [queryKeys.menus.all],
          toast: {
            title: 'Menu restaurado!',
            description: 'O menu foi restaurado da lixeira',
          },
          errorContext: 'Erro ao restaurar menu da lixeira',
          title: 'Restaurar menu da lixeira',
          description:
            'Ao confirmar essa ação, o menu será restaurado da lixeira',
          testId: 'restore-menu-dialog',
          confirmTestId: 'restore-menu-confirm-btn',
        }}
      />
      <ActionDialog
        ref={menuSendToTrashButtonRef}
        config={{
          mutationFn: async function () {
            await API.patch('/menu/'.concat(props.menu._id).concat('/trash'));
          },
          invalidateKeys: [queryKeys.menus.all],
          toast: {
            title: 'Menu enviado para lixeira!',
            description: 'O menu foi movido para a lixeira',
          },
          navigation: { to: '/menus', search: { page: 1, perPage: 50 } },
          errorContext: 'Erro ao enviar menu para lixeira',
          title: 'Enviar menu para a lixeira',
          description:
            'Ao confirmar essa ação, o menu será enviado para a lixeira',
          testId: 'trash-menu-dialog',
          confirmTestId: 'trash-menu-confirm-btn',
        }}
      />
    </div>
  );
}

function buildColumns(params: {
  canTrash: boolean;
  isMaster: boolean;
  getPositionLabel: (menu: IMenu) => string;
  onPermanentDelete: (menu: IMenu) => void;
}): Array<ColumnDef<IMenu, any>> {
  const cols: Array<ColumnDef<IMenu, any>> = [];

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
            aria-label="Selecionar menu"
          />
        </div>
      ),
    });
  }

  cols.push(
    {
      id: 'order',
      accessorKey: 'order',
      meta: { label: 'Posição' },
      size: 110,
      header: () => (
        <DataTableColumnHeader
          title="Posição"
          orderKey="order-position"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {params.getPositionLabel(row.original)}
        </span>
      ),
    },
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
      cell: ({ row, getValue }) => {
        const positionLabel = params.getPositionLabel(row.original);
        const depth = Math.max(
          hasParent(row.original) ? 1 : 0,
          positionLabel.split('.').length - 1,
        );

        return (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-medium',
              depth > 0 && 'text-muted-foreground',
            )}
          >
            {depth > 0 && (
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: depth }).map((_, index) => (
                  <CornerDownRightIcon
                    key={index}
                    className="size-4 text-primary"
                  />
                ))}
              </span>
            )}
            {getValue() as string}
            {row.original.isInitial && (
              <Badge className="ml-1 gap-1 border-transparent bg-primary/10 text-primary hover:bg-primary/10">
                <HouseIcon className="size-3" />
                Inicial
              </Badge>
            )}
          </span>
        );
      },
    },
    {
      id: 'slug',
      accessorKey: 'slug',
      meta: { label: 'Slug' },
      header: () => (
        <DataTableColumnHeader
          title="Slug"
          orderKey="order-slug"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue() as string}</span>
      ),
    },
    {
      id: 'type',
      accessorKey: 'type',
      meta: { label: 'Tipo' },
      header: () => (
        <DataTableColumnHeader
          title="Tipo"
          orderKey="order-type"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ getValue }): React.ReactElement => {
        const type = getValue() as string;
        return (
          <Badge
            className={cn(
              'font-semibold border-transparent',
              type === E_MENU_ITEM_TYPE.PAGE &&
                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              type === E_MENU_ITEM_TYPE.TABLE &&
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
              type === E_MENU_ITEM_TYPE.FORM &&
                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              type === E_MENU_ITEM_TYPE.EXTERNAL &&
                'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
              type === E_MENU_ITEM_TYPE.SEPARATOR &&
                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
            )}
          >
            {TypeMapper[type as keyof typeof TypeMapper] || 'N/A'}
          </Badge>
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
          {getValue() as string}
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
        const date = getValue() as string | undefined;
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
      cell: ({ row }) => (
        <ActionsCell
          menu={row.original}
          isMaster={params.isMaster}
          onPermanentDelete={params.onPermanentDelete}
        />
      ),
    },
  );

  return cols;
}

interface TableMenusProps {
  data: Array<IMenu>;
  toolbarPortal: HTMLDivElement | null;
}

export function TableMenus({
  data,
  toolbarPortal,
}: TableMenusProps): React.JSX.Element {
  const sidebar = useSidebar();
  const router = useRouter();
  const auth = useAuthStore();
  const search = useSearch({ from: '/_private/menus/' });

  const role = auth.user?.group?.slug;
  const isMaster = role === E_ROLE.MASTER;
  const canTrash = role === E_ROLE.MASTER || role === E_ROLE.ADMINISTRATOR;
  const isTrashView = search.trashed === true;

  const [singleDeleteMenu, setSingleDeleteMenu] = React.useState<IMenu | null>(
    null,
  );
  const [bulkTrashOpen, setBulkTrashOpen] = React.useState(false);
  const [bulkRestoreOpen, setBulkRestoreOpen] = React.useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  const tableRef = React.useRef<Table<IMenu> | null>(null);

  const shouldUseHierarchyOrder =
    !search['order-name'] &&
    !search['order-slug'] &&
    !search['order-type'] &&
    !search['order-owner'] &&
    !search['order-created-at'];
  const positionDirection = search['order-position'] ?? 'asc';

  const tableData = React.useMemo(() => {
    if (!shouldUseHierarchyOrder) return data;
    return sortMenuDataByHierarchy(data, positionDirection);
  }, [data, positionDirection, shouldUseHierarchyOrder]);

  const positionLabels = React.useMemo(() => {
    return buildMenuPositionLabels(tableData, positionDirection);
  }, [positionDirection, tableData]);

  const singleDelete = useMenuBulkDelete({
    onSuccess() {
      setSingleDeleteMenu(null);
      toast.success('Menu excluído permanentemente!', {
        description: 'O menu foi excluído permanentemente',
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao excluir menu permanentemente',
      });
    },
  });

  const bulkTrash = useMenuBulkTrash({
    onSuccess(result) {
      setBulkTrashOpen(false);
      tableRef.current?.resetRowSelection();
      const message =
        result.modified === 1
          ? '1 menu enviado para lixeira!'
          : result.modified.toString().concat(' menus enviados para lixeira!');
      toast.success(message, {
        description: 'Os menus foram movidos para a lixeira',
      });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao enviar menus para lixeira' });
    },
  });

  const bulkRestore = useMenuBulkRestore({
    onSuccess(result) {
      setBulkRestoreOpen(false);
      tableRef.current?.resetRowSelection();
      const message =
        result.modified === 1
          ? '1 menu restaurado!'
          : result.modified.toString().concat(' menus restaurados!');
      toast.success(message, {
        description: 'Os menus foram restaurados da lixeira',
      });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao restaurar menus' });
    },
  });

  const bulkDelete = useMenuBulkDelete({
    onSuccess(result) {
      setBulkDeleteOpen(false);
      tableRef.current?.resetRowSelection();
      const message =
        result.deleted === 1
          ? '1 menu excluído permanentemente!'
          : result.deleted
              .toString()
              .concat(' menus excluídos permanentemente!');
      toast.success(message, {
        description: 'Os menus foram excluídos permanentemente',
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao excluir menus permanentemente',
      });
    },
  });

  const columns = React.useMemo(
    () =>
      buildColumns({
        canTrash,
        isMaster,
        getPositionLabel: (menu) =>
          positionLabels.get(menu._id) ?? String(menu.order ?? 0),
        onPermanentDelete: (menu) => setSingleDeleteMenu(menu),
      }),
    [canTrash, isMaster, positionLabels],
  );

  const leftPinning: Array<string> = [];
  if (canTrash) leftPinning.push('_select');

  const table = useDataTable({
    data: tableData,
    columns,
    getRowId: (row) => row._id,
    enableRowSelection: canTrash,
    persistKey: 'admin:menus',
    initialColumnPinning: {
      left: leftPinning,
      right: ['actions'],
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
        data-test-id="menus-table"
        table={table}
        onRowClick={(menu) => {
          sidebar.setOpen(false);
          router.navigate({
            to: '/menus/$menuId',
            params: { menuId: menu._id },
          });
        }}
        emptyMessage="Nenhum item de menu encontrado"
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
        />
      )}

      <PermanentDeleteConfirmDialog
        open={singleDeleteMenu !== null}
        onOpenChange={(open) => {
          if (!open) setSingleDeleteMenu(null);
        }}
        title="Excluir menu permanentemente"
        description="Essa ação é irreversível. O menu será excluído permanentemente e não poderá ser recuperado."
        itemsCount={1}
        isPending={singleDelete.isPending}
        onConfirm={() => {
          if (!singleDeleteMenu) return;
          singleDelete.mutate({ ids: [singleDeleteMenu._id] });
        }}
        testId="delete-menu-dialog"
      />

      <ConfirmDialog
        open={bulkTrashOpen}
        onOpenChange={setBulkTrashOpen}
        title="Enviar menus para a lixeira"
        description="Os menus selecionados serão enviados para a lixeira."
        confirmLabel="Enviar para lixeira"
        isPending={bulkTrash.isPending}
        onConfirm={() => bulkTrash.mutate({ ids: selectedIds })}
        testId="bulk-trash-menus-dialog"
      />

      <ConfirmDialog
        open={bulkRestoreOpen}
        onOpenChange={setBulkRestoreOpen}
        title="Restaurar menus da lixeira"
        description="Os menus selecionados serão restaurados da lixeira."
        confirmLabel="Restaurar"
        isPending={bulkRestore.isPending}
        onConfirm={() => bulkRestore.mutate({ ids: selectedIds })}
        testId="bulk-restore-menus-dialog"
      />

      <PermanentDeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Excluir menus permanentemente"
        description="Essa ação é irreversível. Os menus selecionados serão excluídos permanentemente e não poderão ser recuperados."
        itemsCount={selectedCount}
        isPending={bulkDelete.isPending}
        onConfirm={() => bulkDelete.mutate({ ids: selectedIds })}
        testId="bulk-delete-menus-dialog"
      />
    </>
  );
}
