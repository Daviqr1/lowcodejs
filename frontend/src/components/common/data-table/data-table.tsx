import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { flexRender } from '@tanstack/react-table';
import type { Table as TanstackTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import React from 'react';

import { DataTableDraggableHeader } from './data-table-draggable-header';
import { DataTableResizeHandle } from './data-table-resize-handle';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTableKeyboardNavigation } from '@/hooks/use-table-keyboard-navigation';
import { cn } from '@/lib/utils';

interface DataTableProps<TData> {
  table: TanstackTable<TData>;
  stickyHeader?: boolean;
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  enableVirtualization?: boolean;
  enableKeyboardNavigation?: boolean;
  enableColumnDragging?: boolean;
}

export type InteractiveDataTableProps<TData> = Omit<
  DataTableProps<TData>,
  'enableVirtualization' | 'enableKeyboardNavigation' | 'enableColumnDragging'
>;

export function InteractiveDataTable<TData>(
  props: InteractiveDataTableProps<TData>,
): React.JSX.Element {
  return (
    <DataTable
      {...props}
      enableVirtualization
      enableKeyboardNavigation
      enableColumnDragging
    />
  );
}

export function DataTable<TData>({
  table,
  stickyHeader = true,
  onRowClick,
  emptyMessage = 'Nenhum registro encontrado',
  enableVirtualization = false,
  enableKeyboardNavigation = false,
  enableColumnDragging = false,
}: DataTableProps<TData>): React.JSX.Element {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const columnOrder = table.getState().columnOrder;
  let columnIds = table.getVisibleFlatColumns().map((c) => c.id);
  if (columnOrder.length) columnIds = columnOrder;

  const { containerProps, isCellFocused } = useTableKeyboardNavigation({
    table,
    enabled: enableKeyboardNavigation,
    onRowClick,
  });

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 10,
    enabled: enableVirtualization,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    let currentOrder = table.getVisibleFlatColumns().map((c) => c.id);
    if (columnOrder.length) currentOrder = [...columnOrder];

    const oldIndex = currentOrder.indexOf(active.id as string);
    const newIndex = currentOrder.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    currentOrder.splice(oldIndex, 1);
    currentOrder.splice(newIndex, 0, active.id as string);
    table.setColumnOrder(currentOrder);
  }

  const columnSizeVars = React.useMemo(() => {
    const headers = table.getFlatHeaders();
    const colSizes: Record<string, number> = {};
    for (const header of headers) {
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  }, [table.getState().columnSizingInfo, table.getState().columnSizing]);

  let scrollContainerRef: React.RefObject<HTMLDivElement | null> | undefined;
  if (enableVirtualization) {
    scrollContainerRef = scrollRef;
  }

  const tableContent = (
    <div
      data-slot="data-table"
      data-test-id="data-table"
      ref={scrollContainerRef}
      className={cn(
        'relative w-full overflow-x-auto',
        enableVirtualization && 'overflow-y-auto',
      )}
      {...containerProps}
    >
      <Table style={columnSizeVars}>
        <TableHeader
          data-test-id="data-table-header"
          className={cn(stickyHeader && 'sticky top-0 bg-background z-20')}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const isPinned = header.column.getIsPinned();

                const headerStyle: React.CSSProperties = {
                  width: `calc(var(--col-${header.column.id}-size) * 1px)`,
                };
                if (isPinned) {
                  headerStyle.position = 'sticky';
                  headerStyle.zIndex = 30;
                }
                if (isPinned === 'left') {
                  headerStyle.left = `${header.column.getStart('left')}px`;
                }
                if (isPinned === 'right') {
                  headerStyle.right = `${header.column.getAfter('right')}px`;
                }

                let headerContent: React.ReactNode = null;
                if (!header.isPlaceholder && enableColumnDragging) {
                  headerContent = (
                    <DataTableDraggableHeader header={header}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </DataTableDraggableHeader>
                  );
                } else if (!header.isPlaceholder) {
                  headerContent = flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  );
                }

                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'relative group',
                      isPinned && 'bg-background',
                    )}
                    style={headerStyle}
                  >
                    {headerContent}
                    {header.column.getCanResize() && (
                      <DataTableResizeHandle header={header} />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody data-test-id="data-table-body">
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={table.getAllColumns().length}
                className="text-center py-8 text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {enableVirtualization && (
            <>
              {virtualizer.getVirtualItems().length > 0 && (
                <tr>
                  <td
                    colSpan={table.getAllColumns().length}
                    style={{ height: virtualizer.getVirtualItems()[0].start }}
                  />
                </tr>
              )}
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <TableRow
                    key={row.id}
                    data-test-id={`table-row-${virtualRow.index}`}
                    className={cn(onRowClick && 'cursor-pointer')}
                    data-state={
                      (row.getIsSelected() && 'selected') || undefined
                    }
                    onClick={() => onRowClick?.(row.original)}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                  >
                    {row.getVisibleCells().map((cell, colIndex) => {
                      const isPinned = cell.column.getIsPinned();
                      const cellStyle: React.CSSProperties = {
                        width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                      };
                      if (isPinned) {
                        cellStyle.position = 'sticky';
                        cellStyle.zIndex = 10;
                      }
                      if (isPinned === 'left') {
                        cellStyle.left = `${cell.column.getStart('left')}px`;
                      }
                      if (isPinned === 'right') {
                        cellStyle.right = `${cell.column.getAfter('right')}px`;
                      }
                      return (
                        <TableCell
                          key={cell.id}
                          data-focused={
                            isCellFocused(virtualRow.index, colIndex) ||
                            undefined
                          }
                          className={cn(
                            isPinned && 'bg-background',
                            'data-[focused]:ring-2 data-[focused]:ring-primary data-[focused]:ring-inset',
                          )}
                          style={cellStyle}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
              {virtualizer.getVirtualItems().length > 0 && (
                <tr>
                  <td
                    colSpan={table.getAllColumns().length}
                    style={{
                      height:
                        virtualizer.getTotalSize() -
                        (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                    }}
                  />
                </tr>
              )}
            </>
          )}
          {!enableVirtualization &&
            rows.map((row, rowIndex) => (
              <TableRow
                key={row.id}
                data-test-id={`table-row-${rowIndex}`}
                className={cn(onRowClick && 'cursor-pointer')}
                data-state={(row.getIsSelected() && 'selected') || undefined}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell, colIndex) => {
                  const isPinned = cell.column.getIsPinned();
                  const cellStyle: React.CSSProperties = {
                    width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                  };
                  if (isPinned) {
                    cellStyle.position = 'sticky';
                    cellStyle.zIndex = 10;
                  }
                  if (isPinned === 'left') {
                    cellStyle.left = `${cell.column.getStart('left')}px`;
                  }
                  if (isPinned === 'right') {
                    cellStyle.right = `${cell.column.getAfter('right')}px`;
                  }
                  return (
                    <TableCell
                      key={cell.id}
                      data-focused={
                        isCellFocused(rowIndex, colIndex) || undefined
                      }
                      className={cn(
                        isPinned && 'bg-background',
                        'data-[focused]:ring-2 data-[focused]:ring-primary data-[focused]:ring-inset',
                      )}
                      style={cellStyle}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );

  if (enableColumnDragging) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columnIds}
          strategy={horizontalListSortingStrategy}
        >
          {tableContent}
        </SortableContext>
      </DndContext>
    );
  }

  return tableContent;
}
