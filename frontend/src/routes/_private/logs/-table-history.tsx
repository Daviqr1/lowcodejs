import { useRouter } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { EllipsisIcon, ExternalLinkIcon, FileJsonIcon } from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';

import { ActionBadge } from './-action-badge';
import { ROUTE_ID } from './-constants';

import {
  DataTable,
  DataTableColumnToggle,
} from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDataTable } from '@/hooks/use-data-table';
import { LOGGER_OBJECT_LABEL } from '@/lib/constant';
import { formatDate } from '@/lib/format-date';
import type { ILogger } from '@/lib/interfaces';
import { resolveLoggerNavigateTarget } from '@/lib/logger-route';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authentication';

interface ActionsCellProps {
  entry: ILogger;
  onOpenJson: (entry: ILogger) => void;
  onNavigate: (entry: ILogger) => void;
  canNavigate: boolean;
}

function ActionsCell({
  entry,
  onOpenJson,
  onNavigate,
  canNavigate,
}: ActionsCellProps): React.JSX.Element {
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
            onClick={() => onOpenJson(entry)}
          >
            <FileJsonIcon className="size-4" />
            <span>Visualizar JSON</span>
          </DropdownMenuItem>

          {canNavigate && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full cursor-pointer"
              onClick={() => onNavigate(entry)}
            >
              <ExternalLinkIcon className="size-4" />
              <span>Abrir destino</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function UserRefCell({
  user,
}: {
  user: ILogger['creator'];
}): React.JSX.Element {
  if (!user) {
    return (
      <span className="text-xs italic text-muted-foreground">
        Não informado
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 font-medium"
      title={user.email}
    >
      {user.name}
    </span>
  );
}

function DateRefCell({ value }: { value: string | null }): React.JSX.Element {
  if (!value) {
    return (
      <span className="text-xs italic text-muted-foreground">
        Não informado
      </span>
    );
  }
  return (
    <span className="text-sm text-muted-foreground">{formatDate(value)}</span>
  );
}

function buildColumns(params: {
  currentUserId: string;
  onOpenJson: (entry: ILogger) => void;
  onNavigate: (entry: ILogger) => void;
  canNavigate: (entry: ILogger) => boolean;
}): Array<ColumnDef<ILogger, unknown>> {
  return [
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      meta: { label: 'Data' },
      header: () => (
        <DataTableColumnHeader
          title="Data"
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
    {
      id: 'user',
      accessorKey: 'user',
      meta: { label: 'Usuário' },
      header: () => (
        <DataTableColumnHeader
          title="Usuário"
          orderKey="order-user"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.JSX.Element => {
        const user = row.original.user;
        if (!user) {
          return (
            <span className="text-xs italic text-muted-foreground">
              Anônimo
            </span>
          );
        }
        const isMine = user._id === params.currentUserId;
        return (
          <span
            className={cn('inline-flex items-center gap-1.5 font-medium', {
              'text-primary': isMine,
            })}
            title={user.email}
          >
            {user.name}
            {isMine && (
              <Badge className="border-transparent bg-primary/10 text-primary hover:bg-primary/10">
                Você
              </Badge>
            )}
          </span>
        );
      },
    },
    {
      id: 'action',
      accessorKey: 'action',
      meta: { label: 'Ação' },
      header: () => (
        <DataTableColumnHeader
          title="Ação"
          orderKey="order-action"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.JSX.Element => (
        <ActionBadge action={row.original.action} />
      ),
    },
    {
      id: 'object',
      accessorKey: 'object',
      meta: { label: 'Tipo de objeto' },
      header: () => (
        <DataTableColumnHeader
          title="Tipo de objeto"
          orderKey="order-object"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.ReactElement => {
        const object = row.original.object;
        let label = '—';
        if (object) {
          label = LOGGER_OBJECT_LABEL[object];
        }
        return (
          <Badge className="font-semibold border-transparent bg-gray-100 text-gray-700">
            {label}
          </Badge>
        );
      },
    },
    {
      id: 'object_id',
      accessorKey: 'object_id',
      meta: { label: 'ID do objeto' },
      header: () => (
        <DataTableColumnHeader
          title="ID do objeto"
          orderKey="order-object-id"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.JSX.Element => {
        const id = row.original.object_id;
        if (!id) {
          return <span className="text-muted-foreground">—</span>;
        }
        return <span className="font-mono text-xs">{id}</span>;
      },
    },
    {
      id: 'creator',
      accessorKey: 'creator',
      meta: { label: 'Criado por' },
      header: () => (
        <DataTableColumnHeader
          title="Criado por"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.JSX.Element => (
        <UserRefCell user={row.original.creator} />
      ),
    },
    {
      id: 'objectCreatedAt',
      accessorKey: 'objectCreatedAt',
      meta: { label: 'Criado em' },
      header: () => (
        <DataTableColumnHeader
          title="Criado em"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.JSX.Element => (
        <DateRefCell value={row.original.objectCreatedAt} />
      ),
    },
    {
      id: 'updater',
      accessorKey: 'updater',
      meta: { label: 'Modificado por' },
      header: () => (
        <DataTableColumnHeader
          title="Modificado por"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.JSX.Element => (
        <UserRefCell user={row.original.updater} />
      ),
    },
    {
      id: 'objectUpdatedAt',
      accessorKey: 'objectUpdatedAt',
      meta: { label: 'Modificado em' },
      header: () => (
        <DataTableColumnHeader
          title="Modificado em"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.JSX.Element => (
        <DateRefCell value={row.original.objectUpdatedAt} />
      ),
    },
    {
      id: 'url',
      accessorKey: 'url',
      meta: { label: 'URL' },
      size: 240,
      header: () => (
        <DataTableColumnHeader
          title="URL"
          orderKey="order-url"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.JSX.Element => {
        const entry = row.original;
        if (!params.canNavigate(entry)) {
          return (
            <span
              className="block max-w-[220px] truncate text-sm text-muted-foreground"
              title={entry.url}
            >
              {entry.url}
            </span>
          );
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              params.onNavigate(entry);
            }}
            title={entry.url}
            className="block max-w-[220px] truncate text-left text-sm text-sky-600 hover:underline cursor-pointer dark:text-sky-400"
          >
            {entry.url}
          </button>
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
          entry={row.original}
          onOpenJson={params.onOpenJson}
          onNavigate={params.onNavigate}
          canNavigate={params.canNavigate(row.original)}
        />
      ),
    },
  ];
}

interface Props {
  data: Array<ILogger>;
  toolbarPortal: HTMLDivElement | null;
  onOpenJson: (entry: ILogger) => void;
  isLoading: boolean;
}

export function TableHistory({
  data,
  toolbarPortal,
  onOpenJson,
  isLoading,
}: Props): React.JSX.Element {
  const router = useRouter();
  const auth = useAuthStore();
  const currentUserId = auth.user?._id ?? '';

  const handleNavigate = React.useCallback(
    (entry: ILogger) => {
      const target = resolveLoggerNavigateTarget(entry);
      if (!target) return;
      // target.to e uma rota dinamica resolvida em runtime; navigate nao tipa
      // `to` nao-literal, por isso o cast para o tipo do proprio parametro.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      router.navigate({
        to: target.to,
        params: target.params,
        search: target.search,
      } as Parameters<typeof router.navigate>[0]);
    },
    [router],
  );

  const canNavigate = React.useCallback(
    (entry: ILogger): boolean => resolveLoggerNavigateTarget(entry) !== null,
    [],
  );

  const columns = React.useMemo(
    () =>
      buildColumns({
        currentUserId,
        onOpenJson,
        onNavigate: handleNavigate,
        canNavigate,
      }),
    [currentUserId, onOpenJson, handleNavigate, canNavigate],
  );

  const table = useDataTable({
    data,
    columns,
    getRowId: (row) => row._id,
    persistKey: 'admin:history',
    enableColumnResizing: true,
    initialColumnPinning: {
      right: ['actions'],
    },
  });

  let emptyMessage = 'Nenhum registro encontrado';
  if (isLoading) {
    emptyMessage = 'Carregando...';
  }

  return (
    <>
      {toolbarPortal &&
        createPortal(<DataTableColumnToggle table={table} />, toolbarPortal)}
      <DataTable
        data-test-id="history-table"
        table={table}
        onRowClick={(entry) => onOpenJson(entry)}
        emptyMessage={emptyMessage}
      />
    </>
  );
}
