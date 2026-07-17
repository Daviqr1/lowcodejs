import type { Header } from '@tanstack/react-table';

import { cn } from '@/lib/utils';

type DataTableResizeHandleProps<TData> = {
  header: Header<TData, unknown>;
};

export function DataTableResizeHandle<TData>({
  header,
}: DataTableResizeHandleProps<TData>): React.JSX.Element {
  return (
    <div
      data-slot="data-table-resize-handle"
      data-test-id="resize-handle"
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      onDoubleClick={() => header.column.resetSize()}
      className={cn(
        'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none',
        'opacity-0 group-hover:opacity-100',
        'hover:bg-primary/50',
        header.column.getIsResizing() && 'bg-primary opacity-100',
      )}
    />
  );
}
