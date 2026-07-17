import * as React from 'react';

import { ComboboxLoadMore } from '@/components/common/combobox-load-more';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { Spinner } from '@/components/ui/spinner';
import { useTablesReadPaginatedInfinite } from '@/hooks/tanstack-query/use-tables-read-paginated-infinite';
import type { ITable } from '@/lib/interfaces';

type TableMultiSelectProps = {
  value?: Array<string>;
  onValueChange?: (value: Array<string>, tables?: Array<ITable>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowedTableIds?: Array<string>;
};

export function TableMultiSelect({
  value = [],
  onValueChange,
  placeholder = 'Selecione tabelas...',
  className,
  disabled = false,
  allowedTableIds,
}: TableMultiSelectProps): React.JSX.Element {
  const anchorRef = useComboboxAnchor();
  const [selectedCache, setSelectedCache] = React.useState<Map<string, ITable>>(
    () => new Map(),
  );

  const queryParams = React.useMemo(() => {
    if (allowedTableIds?.length) {
      return { _ids: allowedTableIds, perPage: 10 };
    }
    return { perPage: 10 };
  }, [allowedTableIds]);

  const { data, status, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useTablesReadPaginatedInfinite(queryParams);

  const pageTables = React.useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data?.pages],
  );

  React.useEffect(() => {
    if (!pageTables.length) return;
    setSelectedCache((prev) => {
      const next = new Map(prev);
      for (const table of pageTables) {
        next.set(table._id, table);
      }
      return next;
    });
  }, [pageTables]);

  const selectedTables = React.useMemo<Array<ITable>>(() => {
    const result: Array<ITable> = [];
    for (const id of value) {
      const cached = selectedCache.get(id);
      if (cached) {
        result.push(cached);
        continue;
      }
      const inList = pageTables.find((table) => table._id === id);
      if (inList) result.push(inList);
    }
    return result;
  }, [pageTables, selectedCache, value]);

  const items = React.useMemo<Array<ITable>>(() => {
    const idsInList = new Set(pageTables.map((t) => t._id));
    const extras = selectedTables.filter((t) => !idsInList.has(t._id));
    if (extras.length) return [...pageTables, ...extras];
    return pageTables;
  }, [pageTables, selectedTables]);

  return (
    <Combobox
      data-slot="table-multi-select"
      data-test-id="table-multi-select"
      items={items}
      multiple
      value={selectedTables}
      onValueChange={(newTables: Array<ITable>) => {
        if (newTables.length > 0) {
          setSelectedCache((prev) => {
            const next = new Map(prev);
            for (const table of newTables) {
              next.set(table._id, table);
            }
            return next;
          });
        }
        onValueChange?.(
          newTables.map((p) => p._id),
          newTables,
        );
      }}
      itemToStringLabel={(table: ITable) => table.name}
      disabled={disabled}
    >
      <ComboboxChips
        ref={anchorRef}
        className={className}
      >
        <ComboboxValue>
          {(selectedValue: Array<ITable>): React.ReactNode => {
            let chipsPlaceholder = placeholder;
            if (selectedValue.length > 0) {
              chipsPlaceholder = '';
            }
            return (
              <React.Fragment>
                {selectedValue.map((table) => (
                  <ComboboxChip
                    key={table._id}
                    aria-label={table.name}
                  >
                    {table.name}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder={chipsPlaceholder} />
              </React.Fragment>
            );
          }}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxEmpty>Nenhuma tabela encontrada.</ComboboxEmpty>
        {status === 'pending' && (
          <div className="flex items-center justify-center p-3">
            <Spinner className="opacity-50" />
          </div>
        )}
        {status !== 'pending' && (
          <React.Fragment>
            <ComboboxList>
              {(table: ITable): React.ReactNode => (
                <ComboboxItem
                  key={table._id}
                  value={table}
                >
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium">{table.name}</span>
                    {table.description && (
                      <span className="text-muted-foreground text-sm">
                        {table.description}
                      </span>
                    )}
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
