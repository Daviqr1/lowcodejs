import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  GanttChartIcon,
  XIcon,
} from 'lucide-react';
import React from 'react';

import type { ZoomLevel } from './gantt-types';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { IDropdown, IUser } from '@/lib/interfaces';
import { getUserInitials } from '@/lib/kanban-helpers';
import { cn } from '@/lib/utils';

type GanttToolbarProps = {
  zoom: ZoomLevel;
  onZoomChange: (level: ZoomLevel) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  filterStatus: string | null;
  onFilterStatusChange: (id: string | null) => void;
  filterMember: string | null;
  onFilterMemberChange: (id: string | null) => void;
  listOptions: Array<IDropdown>;
  allMembers: Array<IUser>;
};

export function GanttToolbar({
  zoom,
  onZoomChange,
  onPrev,
  onNext,
  onToday,
  filterStatus,
  onFilterStatusChange,
  filterMember,
  onFilterMemberChange,
  listOptions,
  allMembers,
}: GanttToolbarProps): React.JSX.Element {
  const [showFilters, setShowFilters] = React.useState(false);
  const hasActiveFilter = filterStatus !== null || filterMember !== null;

  let activeFilterCount = 0;
  if (filterStatus) {
    activeFilterCount += 1;
  }
  if (filterMember) {
    activeFilterCount += 1;
  }

  const getZoomLabel = (level: ZoomLevel): string => {
    if (level === 'day') return 'Dia';
    if (level === 'week') return 'Semana';
    return 'Mês';
  };

  let filterButtonVariant: 'secondary' | 'ghost' = 'ghost';
  if (hasActiveFilter) {
    filterButtonVariant = 'secondary';
  }

  const getZoomVariant = (level: ZoomLevel): 'secondary' | 'ghost' => {
    if (zoom === level) return 'secondary';
    return 'ghost';
  };

  return (
    <>
      <div
        data-slot="gantt-toolbar"
        data-test-id="gantt-toolbar"
        className="flex items-center gap-2 border-b px-3 py-2"
      >
        <GanttChartIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Gantt</span>

        <div className="ml-2 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onPrev}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onToday}
          >
            Hoje
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onNext}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        {/* Toggle de filtros */}
        <Button
          type="button"
          variant={filterButtonVariant}
          size="sm"
          className="ml-2 h-7 gap-1 text-xs"
          onClick={() => setShowFilters((v) => !v)}
        >
          <FilterIcon className="size-3" />
          Filtros
          {hasActiveFilter && (
            <Badge
              variant="default"
              className="ml-1 h-4 px-1 text-[10px]"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {hasActiveFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={() => {
              onFilterStatusChange(null);
              onFilterMemberChange(null);
            }}
          >
            <XIcon className="size-3" />
            Limpar
          </Button>
        )}

        <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
          {(['day', 'week', 'month'] as const).map((level) => (
            <Button
              key={level}
              type="button"
              variant={getZoomVariant(level)}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onZoomChange(level)}
            >
              {getZoomLabel(level)}
            </Button>
          ))}
        </div>
      </div>

      {/* Barra de filtros */}
      {showFilters && (
        <div className="flex items-center gap-3 border-b bg-muted/20 px-3 py-1.5">
          {/* Filtro de status */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Status:</span>
            <div className="flex flex-wrap gap-1">
              {listOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={cn(
                    'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                    filterStatus === opt.id &&
                      'border-primary bg-primary/10 font-medium',
                    filterStatus !== opt.id &&
                      'border-transparent hover:bg-muted/50',
                  )}
                  onClick={() => {
                    if (filterStatus === opt.id) {
                      onFilterStatusChange(null);
                    } else {
                      onFilterStatusChange(opt.id);
                    }
                  }}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: opt.color ?? '#9ca3af' }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de membro */}
          {allMembers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Membro:</span>
              <div className="flex flex-wrap gap-1">
                {allMembers.map((member) => (
                  <button
                    key={member._id}
                    type="button"
                    className={cn(
                      'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                      filterMember === member._id &&
                        'border-primary bg-primary/10 font-medium',
                      filterMember !== member._id &&
                        'border-transparent hover:bg-muted/50',
                    )}
                    onClick={() => {
                      if (filterMember === member._id) {
                        onFilterMemberChange(null);
                      } else {
                        onFilterMemberChange(member._id);
                      }
                    }}
                  >
                    <Avatar className="size-4">
                      <AvatarFallback className="text-[8px]">
                        {getUserInitials(member)}
                      </AvatarFallback>
                    </Avatar>
                    {member.name || member.email}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
