import * as React from 'react';

import { ComboboxLoadMore } from '@/components/common/combobox-load-more';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { useTablesReadPaginatedInfinite } from '@/hooks/tanstack-query/use-tables-read-paginated-infinite';
import type { ITable } from '@/lib/interfaces';

type TableComboboxProps = {
  value?: string;
  onValueChange?: (value: string, slug?: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  excludeSlug?: string;
};

export function TableCombobox({
  value = '',
  onValueChange,
  placeholder = 'Selecione uma tabela...',
  className,
  disabled = false,
  excludeSlug,
}: TableComboboxProps): React.JSX.Element {
  const { data, status, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useTablesReadPaginatedInfinite({ perPage: 10 });

  const tables = React.useMemo(() => {
    const allTables = data?.pages.flatMap((page) => page.data) ?? [];
    if (!excludeSlug) return allTables;
    return allTables.filter((t) => t.slug !== excludeSlug);
  }, [data?.pages, excludeSlug]);

  // Find selected table
  const selectedTable = React.useMemo(() => {
    return tables.find((t) => t._id === value) ?? null;
  }, [tables, value]);

  return (
    <Combobox
      data-slot="table-combobox"
      data-test-id="table-combobox"
      items={tables}
      value={selectedTable}
      onValueChange={(table: ITable | null) => {
        onValueChange?.(table?._id ?? '', table?.slug);
      }}
      itemToStringLabel={(table: ITable) => table.name}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder={selectedTable?.name || placeholder}
        showClear={!!selectedTable}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhuma tabela encontrada.</ComboboxEmpty>
        {status === 'pending' && (
          <div className="text-muted-foreground p-3 text-center text-sm">
            Carregando...
          </div>
        )}
        {status === 'success' && (
          <React.Fragment>
            <ComboboxList>
              {(table: ITable): React.ReactNode => (
                <ComboboxItem
                  key={table._id}
                  value={table}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{table.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {table.slug}
                    </span>
                  </div>
                </ComboboxItem>
              )}
            </ComboboxList>
            <ComboboxLoadMore
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={() => fetchNextPage()}
            />
          </React.Fragment>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
