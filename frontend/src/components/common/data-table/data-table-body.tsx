import { flexRender } from '@tanstack/react-table';
import type { Table as TanstackTable } from '@tanstack/react-table';
import React from 'react';

import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type DataTableBodyProps<TData> = {
  table: TanstackTable<TData>;
  onRowClick?: (row: TData) => void;
  emptyMessage: string;
};

function DataTableBodyInner<TData>({
  table,
  onRowClick,
  emptyMessage,
}: DataTableBodyProps<TData>): React.JSX.Element {
  return (
    <TableBody
      data-slot="data-table-body"
      data-test-id="data-table-body"
    >
      {table.getRowModel().rows.length === 0 && (
        <TableRow>
          <TableCell
            colSpan={table.getAllColumns().length}
            className="text-center py-8 text-muted-foreground"
          >
            {emptyMessage}
          </TableCell>
        </TableRow>
      )}
      {table.getRowModel().rows.map((row, index) => {
        let dataState: 'selected' | undefined = undefined;
        if (row.getIsSelected()) {
          dataState = 'selected';
        }

        return (
          <TableRow
            key={row.id}
            data-test-id={`table-row-${index}`}
            className={cn(onRowClick && 'cursor-pointer')}
            data-state={dataState}
            onClick={() => onRowClick?.(row.original)}
          >
            {row.getVisibleCells().map((cell) => {
              const isPinned = cell.column.getIsPinned();

              let positionStyle: React.CSSProperties['position'] = undefined;
              if (isPinned) {
                positionStyle = 'sticky';
              }

              let leftStyle: string | undefined = undefined;
              if (isPinned === 'left') {
                leftStyle = `${cell.column.getStart('left')}px`;
              }

              let rightStyle: string | undefined = undefined;
              if (isPinned === 'right') {
                rightStyle = `${cell.column.getAfter('right')}px`;
              }

              let zIndexStyle: number | undefined = undefined;
              if (isPinned) {
                zIndexStyle = 10;
              }

              return (
                <TableCell
                  key={cell.id}
                  style={{
                    width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                    position: positionStyle,
                    left: leftStyle,
                    right: rightStyle,
                    zIndex: zIndexStyle,
                  }}
                  className={cn(isPinned && 'bg-background')}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              );
            })}
          </TableRow>
        );
      })}
    </TableBody>
  );
}

// React.memo apaga a assinatura generica do componente; o `as` restaura o
// call signature de DataTableBodyInner<TData> (limitacao de tipagem do React).
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const DataTableBody = React.memo(
  DataTableBodyInner,
) as typeof DataTableBodyInner;
