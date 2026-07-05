import { FilterIcon } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FilterTriggerProps = {
  activeFiltersCount: number;
  onClick: () => void;
  isOpen: boolean;
};

export function FilterTrigger({
  activeFiltersCount,
  onClick,
  isOpen,
}: FilterTriggerProps): React.JSX.Element {
  return (
    <div
      data-slot="filter-trigger"
      className="relative"
    >
      <Button
        data-test-id="filter-trigger-btn"
        className={cn('shadow-none p-1 h-auto', isOpen && 'bg-accent')}
        variant="outline"
        onClick={onClick}
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
  );
}
