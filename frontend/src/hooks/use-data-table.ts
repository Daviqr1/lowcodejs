import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type {
  ColumnDef,
  ColumnPinningState,
  ColumnSizingState,
  Row,
  RowSelectionState,
  Table,
  TableMeta,
  VisibilityState,
} from '@tanstack/react-table';
import React from 'react';

import { usePersistedTableState } from './use-persisted-table-state';

type UseDataTableOptions<TData> = {
  data: Array<TData>;
  columns: Array<ColumnDef<TData, unknown>>;
  pageCount?: number;
  getRowId?: (row: TData) => string;
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
  enableColumnResizing?: boolean;
  initialColumnVisibility?: VisibilityState;
  initialColumnPinning?: ColumnPinningState;
  initialColumnOrder?: Array<string>;
  initialColumnSizing?: ColumnSizingState;
  persistKey?: string;
  meta?: TableMeta<TData>;
};

export function useDataTable<TData>({
  data,
  columns,
  pageCount,
  getRowId,
  enableRowSelection = false,
  enableColumnResizing = false,
  initialColumnVisibility = {},
  initialColumnPinning = {},
  initialColumnOrder = [],
  initialColumnSizing = {},
  persistKey,
  meta,
}: UseDataTableOptions<TData>): Table<TData> {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnPinning, setColumnPinning] =
    React.useState<ColumnPinningState>(initialColumnPinning);

  const {
    columnVisibility,
    setColumnVisibility,
    columnOrder,
    setColumnOrder,
    columnSizing,
    setColumnSizing,
  } = usePersistedTableState({
    persistKey,
    initialColumnVisibility,
    initialColumnOrder,
    initialColumnSizing,
  });

  const table = useReactTable({
    data,
    columns,
    pageCount,
    getRowId,
    meta,
    state: {
      rowSelection,
      columnVisibility,
      columnPinning,
      columnOrder,
      columnSizing,
    },
    enableRowSelection,
    enableColumnResizing,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
  });

  return table;
}
