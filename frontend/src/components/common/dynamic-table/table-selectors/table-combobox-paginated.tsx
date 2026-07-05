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
import { Spinner } from '@/components/ui/spinner';
import { useTablesReadPaginatedInfinite } from '@/hooks/tanstack-query/use-tables-read-paginated-infinite';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { ITable } from '@/lib/interfaces';

type TableComboboxPaginatedProps = {
  value?: string;
  onValueChange?: (value: string, slug?: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function TableComboboxPaginated({
  value = '',
  onValueChange,
  placeholder = 'Selecione uma tabela...',
  className,
  disabled = false,
}: TableComboboxPaginatedProps): React.JSX.Element {
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useTablesReadPaginatedInfinite({
      perPage: 10,
      search: debouncedSearch || undefined,
    });

  const tables = React.useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data?.pages],
  );

  const selectedTable = React.useMemo(
    () => tables.find((t) => t._id === value) ?? null,
    [tables, value],
  );

  return (
    <Combobox
      data-slot="table-combobox-paginated"
      data-test-id="table-combobox-paginated"
      items={tables}
      value={selectedTable}
      onValueChange={(table: ITable | null) => {
        onValueChange?.(table?._id ?? '', table?.slug);
      }}
      onInputValueChange={setSearch}
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
          <div className="text-muted-foreground flex items-center justify-center gap-2 p-3 text-sm">
            <Spinner className="size-4" />
            Carregando...
          </div>
        )}

        {status === 'success' && (
          <>
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
          </>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
