import { flexRender } from '@tanstack/react-table';
import type { Table as TanstackTable } from '@tanstack/react-table';
import React from 'react';

import { cn } from '@/lib/utils';

type DataTableMobileCardsProps<TData> = {
  table: TanstackTable<TData>;
  onRowClick?: (row: TData) => void;
  emptyMessage: string;
};

// Layout empilhado (label : valor) para telas estreitas. Reaproveita os cell
// renderers e headers das colunas — nenhum tratamento por tipo de campo aqui.
// Colunas de display (sem `accessorFn`: select, acoes, navegacao) nao tem label
// e vao numa linha de controles no topo do card.
export function DataTableMobileCards<TData>({
  table,
  onRowClick,
  emptyMessage,
}: DataTableMobileCardsProps<TData>): React.JSX.Element {
  const rows = table.getRowModel().rows;

  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        {emptyMessage}
      </div>
    );
  }

  const headerLabels = new Map<string, React.ReactNode>();
  for (const header of table.getFlatHeaders()) {
    if (header.isPlaceholder) continue;
    headerLabels.set(
      header.column.id,
      flexRender(header.column.columnDef.header, header.getContext()),
    );
  }

  return (
    <div
      data-slot="data-table-mobile-cards"
      className="flex flex-col gap-3 p-1"
    >
      {rows.map((row, index) => {
        const cells = row.getVisibleCells();
        const displayCells = cells.filter(
          (cell) => cell.column.accessorFn == null,
        );
        const dataCells = cells.filter(
          (cell) => cell.column.accessorFn != null,
        );

        let dataState: 'selected' | undefined = undefined;
        if (row.getIsSelected()) dataState = 'selected';

        return (
          <div
            key={row.id}
            data-test-id={`table-card-${index}`}
            data-state={dataState}
            className={cn(
              'bg-card flex flex-col gap-2 rounded-lg border p-3',
              'data-[state=selected]:border-primary data-[state=selected]:bg-muted/40',
              onRowClick && 'cursor-pointer',
            )}
            onClick={() => onRowClick?.(row.original)}
          >
            {displayCells.length > 0 && (
              <div
                className="flex flex-wrap items-center justify-between gap-2"
                onClick={(event) => event.stopPropagation()}
              >
                {displayCells.map((cell) => (
                  <div key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            )}
            <dl className="flex flex-col gap-1.5">
              {dataCells.map((cell) => (
                <div
                  key={cell.id}
                  className="flex items-start justify-between gap-3"
                >
                  <dt className="text-muted-foreground pointer-events-none max-w-[45%] shrink-0 truncate text-xs font-medium">
                    {headerLabels.get(cell.column.id)}
                  </dt>
                  <dd className="min-w-0 break-words text-right text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
