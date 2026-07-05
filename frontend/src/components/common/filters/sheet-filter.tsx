import { useSearch } from '@tanstack/react-router';
import { FilterIcon } from 'lucide-react';
import React from 'react';

import {
  FilterFieldsForm,
  useFilterState,
} from '@/components/common/filters/filter-fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { IFilterField } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

type SheetFilterProps = {
  fields: Array<IFilterField>;
};

export function SheetFilter({ fields }: SheetFilterProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const search = useSearch({ strict: false });

  const {
    filterValues,
    setFilterValues,
    handleSubmit,
    handleClear,
    removeFilter,
    handleMultiValueChange,
    activeFiltersCount,
  } = useFilterState(fields, {
    closeOnSubmit: true,
    onClose: () => setOpen(false),
  });

  return (
    <Sheet
      data-slot="sheet-filter"
      open={open}
      onOpenChange={setOpen}
    >
      <SheetTrigger asChild>
        <div className="relative">
          <Button
            data-test-id="filter-trigger-btn"
            className={cn('shadow-none p-1 h-auto')}
            variant="outline"
          >
            <FilterIcon className="size-4" />
            <span>Filtros</span>
          </Button>
          {activeFiltersCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center rounded-full"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </div>
      </SheetTrigger>
      <SheetContent className="flex flex-col py-4 px-6 gap-5 sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="px-0">
          <SheetTitle className="text-lg font-medium">Filtros</SheetTitle>
          <SheetDescription>
            Aplique filtros para a busca de dados
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 w-full">
          <FilterFieldsForm
            fields={fields}
            filterValues={filterValues}
            setFilterValues={setFilterValues}
            removeFilter={removeFilter}
            handleMultiValueChange={handleMultiValueChange}
            search={search}
          />

          <SheetFooter className="flex-row w-full justify-end gap-4 px-0">
            <Button
              data-test-id="filter-clear-btn"
              onClick={handleClear}
              type="button"
              className="shadow-none border bg-transparent border-destructive text-destructive hover:bg-destructive/20"
            >
              Limpar
            </Button>
            <Button
              data-test-id="filter-submit-btn"
              onClick={handleSubmit}
            >
              Pesquisar
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
