import { useSearch } from '@tanstack/react-router';
import { FilterIcon, XIcon } from 'lucide-react';
import React from 'react';

import { ExtensionSlot } from '@/components/common/extension-slot';
import {
  FilterFieldsForm,
  useFilterState,
} from '@/components/common/filters/filter-fields';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import type { IFilterField, ITable } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

type FilterSidebarProps = {
  fields: Array<IFilterField>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tabela em foco — usado pelo slot de extensões table.filters para filtrar por tableScope. */
  table?: ITable;
};

export function FilterSidebar({
  fields,
  open,
  onOpenChange,
  table,
}: FilterSidebarProps): React.JSX.Element {
  const isMobile = useIsMobile();
  const search = useSearch({ strict: false });

  const {
    filterValues,
    setFilterValues,
    handleSubmit,
    handleClear,
    removeFilter,
    handleMultiValueChange,
  } = useFilterState(fields);

  if (isMobile) {
    return (
      <Sheet
        data-slot="filter-sidebar"
        data-test-id="filter-sidebar"
        open={open}
        onOpenChange={onOpenChange}
      >
        <SheetContent
          side="left"
          className="flex flex-col py-4 px-6 gap-5 overflow-y-auto"
        >
          <SheetHeader className="px-0">
            <SheetTitle className="text-lg font-medium flex items-center gap-2">
              <FilterIcon className="size-4" />
              Filtros
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 w-full flex-1">
            <ExtensionSlot
              id="table.filters"
              context={{ table, fields }}
            />
            <FilterFieldsForm
              fields={fields}
              filterValues={filterValues}
              setFilterValues={setFilterValues}
              removeFilter={removeFilter}
              handleMultiValueChange={handleMultiValueChange}
              search={search}
            />
          </div>

          <SheetFooter className="flex-row w-full justify-end gap-4 px-0">
            <Button
              data-test-id="filter-clear-btn"
              onClick={() => {
                handleClear();
                onOpenChange(false);
              }}
              type="button"
              className="shadow-none border bg-transparent border-destructive text-destructive hover:bg-destructive/20"
            >
              Limpar
            </Button>
            <Button
              data-test-id="filter-submit-btn"
              onClick={() => {
                handleSubmit();
                onOpenChange(false);
              }}
            >
              Pesquisar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-slot="filter-sidebar"
      data-test-id="filter-sidebar"
      className={cn(
        'shrink-0 transition-[width] duration-200 ease-linear overflow-hidden border-r',
        open && 'w-70',
        !open && 'w-0 border-r-0',
      )}
    >
      <div className="w-70 h-full flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <FilterIcon className="size-4" />
            Filtros
          </h2>
          <Button
            data-test-id="filter-close-btn"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <ExtensionSlot
            id="table.filters"
            context={{ table, fields }}
          />
          <FilterFieldsForm
            fields={fields}
            filterValues={filterValues}
            setFilterValues={setFilterValues}
            removeFilter={removeFilter}
            handleMultiValueChange={handleMultiValueChange}
            search={search}
          />
        </div>

        <div className="shrink-0 flex justify-end gap-2 px-4 py-3 border-t">
          <Button
            data-test-id="filter-clear-btn"
            onClick={handleClear}
            type="button"
            size="sm"
            className="shadow-none border bg-transparent border-destructive text-destructive hover:bg-destructive/20"
          >
            Limpar
          </Button>
          <Button
            data-test-id="filter-submit-btn"
            onClick={handleSubmit}
            size="sm"
          >
            Pesquisar
          </Button>
        </div>
      </div>
    </div>
  );
}
