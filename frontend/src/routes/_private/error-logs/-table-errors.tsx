import type { ColumnDef } from '@tanstack/react-table';
import {
  CheckCheckIcon,
  EllipsisIcon,
  FileJsonIcon,
  RotateCcwIcon,
} from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { ROUTE_ID } from './-constants';
import { StatusBadge } from './-status-badge';

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
import type { IErrorLog } from '@/hooks/tanstack-query/use-error-log-read-paginated';
import { useErrorLogResolve } from '@/hooks/tanstack-query/use-error-log-resolve';
import { useDataTable } from '@/hooks/use-data-table';
import { formatDate } from '@/lib/format-date';

interface ActionsCellProps {
  entry: IErrorLog;
  onOpenJson: (entry: IErrorLog) => void;
  onResolve: (entry: IErrorLog) => void;
}

function ActionsCell({
  entry,
  onOpenJson,
  onResolve,
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

          <DropdownMenuItem
            className="inline-flex space-x-1 w-full cursor-pointer"
            onClick={() => onResolve(entry)}
          >
            {!entry.resolved && (
              <>
                <CheckCheckIcon className="size-4" />
                <span>Marcar como resolvido</span>
              </>
            )}
            {entry.resolved && (
              <>
                <RotateCcwIcon className="size-4" />
                <span>Reabrir</span>
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function buildColumns(params: {
  onOpenJson: (entry: IErrorLog) => void;
  onResolve: (entry: IErrorLog) => void;
}): Array<ColumnDef<IErrorLog, unknown>> {
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
      cell: ({ row }): React.JSX.Element => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'statusCode',
      accessorKey: 'statusCode',
      meta: { label: 'Status' },
      header: () => (
        <DataTableColumnHeader
          title="Status"
          orderKey="order-status"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.JSX.Element => (
        <StatusBadge status={row.original.statusCode} />
      ),
    },
    {
      id: 'user',
      accessorKey: 'user',
      meta: { label: 'Usuário' },
      header: () => (
        <DataTableColumnHeader
          title="Usuário"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.JSX.Element => {
        const user = row.original.user;
        if (!user) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <span
            className="inline-flex items-center gap-1.5 font-medium"
            title={user.email}
          >
            {user.name}
          </span>
        );
      },
    },
    {
      id: 'method',
      accessorKey: 'method',
      meta: { label: 'Método' },
      header: () => (
        <DataTableColumnHeader
          title="Método"
          orderKey="order-method"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.JSX.Element => (
        <Badge className="font-mono font-semibold border-transparent bg-gray-100 text-gray-700">
          {row.original.method}
        </Badge>
      ),
    },
    {
      id: 'message',
      accessorKey: 'message',
      meta: { label: 'Mensagem' },
      size: 280,
      header: () => (
        <DataTableColumnHeader
          title="Mensagem"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.JSX.Element => (
        <span
          className="block max-w-[280px] truncate text-sm"
          title={row.original.message}
        >
          {row.original.message}
        </span>
      ),
    },
    {
      id: 'cause',
      accessorKey: 'cause',
      meta: { label: 'Cause' },
      header: () => (
        <DataTableColumnHeader
          title="Cause"
          routeId={ROUTE_ID}
        />
      ),
      cell: ({ row }): React.JSX.Element => {
        const cause = row.original.cause;
        if (!cause) {
          return <span className="text-muted-foreground">—</span>;
        }
        return <span className="font-mono text-xs">{cause}</span>;
      },
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
      cell: ({ row }): React.JSX.Element => (
        <span
          className="block max-w-[220px] truncate text-sm text-muted-foreground"
          title={row.original.url}
        >
          {row.original.url}
        </span>
      ),
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
          onResolve={params.onResolve}
        />
      ),
    },
  ];
}

interface Props {
  data: Array<IErrorLog>;
  toolbarPortal: HTMLDivElement | null;
  onOpenJson: (entry: IErrorLog) => void;
  isLoading: boolean;
  isResolvedView: boolean;
  onViewResolved: (show: boolean) => void;
}

export function TableErrors({
  data,
  toolbarPortal,
  onOpenJson,
  isLoading,
  isResolvedView,
  onViewResolved,
}: Props): React.JSX.Element {
  const { mutate: resolveErrorLog } = useErrorLogResolve({
    onError: () => {
      toast.error('Não foi possível atualizar o erro');
    },
  });

  const handleResolve = React.useCallback(
    (entry: IErrorLog): void => {
      const nextResolved = !entry.resolved;
      resolveErrorLog(
        { id: entry._id, resolved: nextResolved },
        {
          onSuccess: () => {
            if (nextResolved) {
              toast.success('Marcado como resolvido', {
                description: 'Saiu da lista "Em aberto".',
                action: {
                  label: 'Ver resolvidos',
                  onClick: () => onViewResolved(true),
                },
              });
            } else {
              toast.success('Reaberto', {
                action: {
                  label: 'Ver em aberto',
                  onClick: () => onViewResolved(false),
                },
              });
            }
          },
        },
      );
    },
    [resolveErrorLog, onViewResolved],
  );

  const columns = React.useMemo(
    () => buildColumns({ onOpenJson, onResolve: handleResolve }),
    [onOpenJson, handleResolve],
  );

  const table = useDataTable({
    data,
    columns,
    getRowId: (row) => row._id,
    persistKey: 'admin:error-logs',
    enableColumnResizing: true,
    initialColumnPinning: {
      right: ['actions'],
    },
  });

  let emptyMessage = 'Nenhum erro em aberto';
  if (isResolvedView) {
    emptyMessage = 'Nenhum erro resolvido';
  }
  if (isLoading) {
    emptyMessage = 'Carregando...';
  }

  return (
    <>
      {toolbarPortal &&
        createPortal(<DataTableColumnToggle table={table} />, toolbarPortal)}
      <DataTable
        data-test-id="error-logs-table"
        table={table}
        onRowClick={(entry) => onOpenJson(entry)}
        emptyMessage={emptyMessage}
      />
    </>
  );
}
