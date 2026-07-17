import type { Table as TanstackTable } from '@tanstack/react-table';
import { SlidersHorizontalIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type DataTableColumnToggleProps<TData> = {
  table: TanstackTable<TData>;
};

export function DataTableColumnToggle<TData>({
  table,
}: DataTableColumnToggleProps<TData>): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-slot="data-table-column-toggle"
          data-test-id="column-toggle-btn"
          variant="outline"
          size="sm"
          className="h-8"
        >
          <SlidersHorizontalIcon className="size-4" />
          <span>Colunas</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              data-test-id={`column-toggle-${column.id}`}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.columnDef.meta?.label ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
