import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { differenceInDays, format } from 'date-fns';
import { ChevronsDownIcon } from 'lucide-react';
import React from 'react';

import type { DragMode, GanttRow } from './gantt-types';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip';
import { getUserInitials } from '@/lib/kanban-helpers';
import { cn } from '@/lib/utils';

type GanttBarProps = {
  ganttRow: GanttRow;
  bar: { left: number; width: number };
  barColor: string;
  dayWidth: number;
  rowHeight: number;
  isDragging: boolean;
  dragOffsetY: number;
  onBarMouseDown: (
    e: React.MouseEvent,
    ganttRow: GanttRow,
    mode: DragMode,
  ) => void;
  onBarClick: () => void;
};

export function GanttBar({
  ganttRow,
  bar,
  barColor,
  dayWidth,
  rowHeight,
  isDragging,
  dragOffsetY,
  onBarMouseDown,
  onBarClick,
}: GanttBarProps): React.JSX.Element {
  const barHeight = rowHeight - 8;
  const mouseDownPos = React.useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, mode: DragMode): void => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    onBarMouseDown(e, ganttRow, mode);
  };

  const handleClick = (e: React.MouseEvent): void => {
    // Só abre o dialog se o usuário não arrastou
    if (mouseDownPos.current) {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);
      if (dx > 3 || dy > 3) {
        e.stopPropagation();
        return;
      }
    }
    e.stopPropagation();
    onBarClick();
  };

  let cursorStyle = 'grab';
  if (isDragging) {
    cursorStyle = 'grabbing';
  }

  let transformStyle: string | undefined = undefined;
  if (isDragging) {
    transformStyle = `translateY(${dragOffsetY}px)`;
  }

  let progressBorderRadius = '0.125rem 0 0 0.125rem';
  if (ganttRow.progress !== null && ganttRow.progress >= 100) {
    progressBorderRadius = 'inherit';
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          data-slot="gantt-bar"
          data-test-id="gantt-bar"
          data-gantt-bar
          className={cn(
            'group/bar absolute top-1 rounded-sm shadow-sm transition-shadow',
            isDragging && 'z-30 shadow-md ring-2 ring-primary/30',
            !isDragging &&
              ganttRow.isOverdue &&
              'ring-2 ring-red-500/70 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
          )}
          style={{
            left: bar.left,
            width: Math.max(bar.width, dayWidth),
            height: barHeight,
            backgroundColor: barColor,
            cursor: cursorStyle,
            transform: transformStyle,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'move')}
          onClick={handleClick}
        >
          {/* Barra de progresso */}
          {ganttRow.progress !== null && ganttRow.progress > 0 && (
            <div
              className="absolute inset-y-0 left-0 rounded-l-sm bg-black/20"
              style={{
                width: `${Math.min(ganttRow.progress, 100)}%`,
                borderRadius: progressBorderRadius,
              }}
            />
          )}

          {/* Texto do título */}
          <span className="pointer-events-none relative z-[1] block truncate px-4 text-[11px] font-medium leading-7 text-white">
            {ganttRow.title}
            {ganttRow.progress !== null && (
              <span className="ml-1 opacity-80">({ganttRow.progress}%)</span>
            )}
          </span>

          {/* Handle de resize esquerdo */}
          <div
            className="absolute inset-y-0 left-0 z-10 w-3 cursor-col-resize"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleMouseDown(e, 'resize-left');
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-y-1 left-0.5 w-1 rounded-full bg-white/0 transition-colors group-hover/bar:bg-white/60" />
          </div>
          {/* Handle de resize direito */}
          <div
            className="absolute inset-y-0 right-0 z-10 w-3 cursor-col-resize"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleMouseDown(e, 'resize-right');
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-y-1 right-0.5 w-1 rounded-full bg-white/0 transition-colors group-hover/bar:bg-white/60" />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          sideOffset={4}
          className="relative z-50 max-w-64 animate-in fade-in-0 zoom-in-95 overflow-visible rounded-md bg-popover px-3 py-1.5 text-popover-foreground shadow-lg"
        >
          <div className="space-y-1.5">
            <p className="font-medium text-sm">{ganttRow.title}</p>

            {ganttRow.start && (
              <p className="text-xs text-muted-foreground">
                {format(ganttRow.start, 'dd/MM/yyyy')}
                {ganttRow.end && ` — ${format(ganttRow.end, 'dd/MM/yyyy')}`}
                {ganttRow.end && (
                  <span className="ml-1">
                    ({differenceInDays(ganttRow.end, ganttRow.start)} dias)
                  </span>
                )}
              </p>
            )}

            {ganttRow.status && (
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor: ganttRow.status.color ?? '#9ca3af',
                  }}
                />
                <span className="text-xs">{ganttRow.status.label}</span>
              </div>
            )}

            {ganttRow.progress !== null && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${ganttRow.progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {ganttRow.progress}%
                </span>
              </div>
            )}

            {ganttRow.members.length > 0 && (
              <div className="flex items-center gap-1">
                {ganttRow.members.slice(0, 5).map((member, i) => (
                  <Avatar
                    key={i}
                    className="size-5 border border-background"
                  >
                    <AvatarFallback className="text-[8px]">
                      {getUserInitials(member)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {ganttRow.members.length > 5 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{ganttRow.members.length - 5}
                  </span>
                )}
              </div>
            )}

            {ganttRow.dependencyIds.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {ganttRow.dependencyIds.length} dependência(s)
              </p>
            )}

            {ganttRow.isOverdue && (
              <p className="text-[10px] font-semibold text-red-500">
                Em atraso
              </p>
            )}
          </div>
          <ChevronsDownIcon className="absolute -bottom-2.5 left-1/2 size-5 -translate-x-1/2 text-popover-foreground/60" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </Tooltip>
  );
}
