import type { Table as TanstackTable } from '@tanstack/react-table';
import React from 'react';

type FocusedCell = {
  rowIndex: number;
  colIndex: number;
};

type UseTableKeyboardNavigationOptions<TData> = {
  table: TanstackTable<TData>;
  enabled?: boolean;
  onRowClick?: (row: TData) => void;
};

export function useTableKeyboardNavigation<TData>({
  table,
  enabled = false,
  onRowClick,
}: UseTableKeyboardNavigationOptions<TData>): {
  containerProps:
    | {
        onKeyDown: (e: React.KeyboardEvent) => void;
        tabIndex: number;
        role: 'grid';
      }
    | Record<string, never>;
  isCellFocused: (rowIndex: number, colIndex: number) => boolean;
  focusedCell: FocusedCell | null;
} {
  const [focusedCell, setFocusedCell] = React.useState<FocusedCell | null>(
    null,
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled) return;

      const rows = table.getRowModel().rows;
      const cols = table.getVisibleFlatColumns();
      if (rows.length === 0) return;

      const current = focusedCell ?? { rowIndex: 0, colIndex: 0 };

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedCell({
            rowIndex: Math.min(current.rowIndex + 1, rows.length - 1),
            colIndex: current.colIndex,
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedCell({
            rowIndex: Math.max(current.rowIndex - 1, 0),
            colIndex: current.colIndex,
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setFocusedCell({
            rowIndex: current.rowIndex,
            colIndex: Math.min(current.colIndex + 1, cols.length - 1),
          });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedCell({
            rowIndex: current.rowIndex,
            colIndex: Math.max(current.colIndex - 1, 0),
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (onRowClick && rows[current.rowIndex]) {
            onRowClick(rows[current.rowIndex].original);
          }
          break;
        case ' ':
          e.preventDefault();
          rows[current.rowIndex]?.toggleSelected();
          break;
        case 'Home':
          e.preventDefault();
          setFocusedCell({ rowIndex: current.rowIndex, colIndex: 0 });
          break;
        case 'End':
          e.preventDefault();
          setFocusedCell({
            rowIndex: current.rowIndex,
            colIndex: cols.length - 1,
          });
          break;
        case 'Escape':
          setFocusedCell(null);
          break;
      }
    },
    [enabled, table, focusedCell, onRowClick],
  );

  let containerProps:
    | { onKeyDown: typeof handleKeyDown; tabIndex: number; role: 'grid' }
    | Record<string, never> = {};
  if (enabled) {
    containerProps = {
      onKeyDown: handleKeyDown,
      tabIndex: 0,
      role: 'grid',
    };
  }

  const isCellFocused = React.useCallback(
    (rowIndex: number, colIndex: number) => {
      if (!focusedCell) return false;
      return (
        focusedCell.rowIndex === rowIndex && focusedCell.colIndex === colIndex
      );
    },
    [focusedCell],
  );

  return { containerProps, isCellFocused, focusedCell };
}
