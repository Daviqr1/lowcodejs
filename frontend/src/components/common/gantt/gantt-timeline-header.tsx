import { format, isToday, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React from 'react';

import type { ZoomLevel } from './gantt-types';

import { cn } from '@/lib/utils';

type TimelineMonthHeadersProps = {
  days: Array<Date>;
  dayWidth: number;
};

export function TimelineMonthHeaders({
  days,
  dayWidth,
}: TimelineMonthHeadersProps): React.JSX.Element {
  const months: Array<{ label: string; width: number }> = [];
  let currentLabel = '';
  let currentWidth = 0;

  for (const day of days) {
    const label = format(day, 'MMMM yyyy', { locale: ptBR });
    if (label !== currentLabel) {
      if (currentLabel)
        months.push({ label: currentLabel, width: currentWidth });
      currentLabel = label;
      currentWidth = dayWidth;
    } else {
      currentWidth += dayWidth;
    }
  }
  if (currentLabel) months.push({ label: currentLabel, width: currentWidth });

  return (
    <div
      data-slot="timeline-month-headers"
      className="flex"
      style={{ height: 28 }}
    >
      {months.map((m, i) => (
        <div
          key={i}
          className="shrink-0 truncate border-r px-2 text-xs font-medium leading-7 capitalize"
          style={{ width: m.width }}
        >
          {m.label}
        </div>
      ))}
    </div>
  );
}

type GanttTimelineHeaderProps = {
  days: Array<Date>;
  dayWidth: number;
  zoom: ZoomLevel;
  headerHeight: number;
};

export function GanttTimelineHeader({
  days,
  dayWidth,
  zoom,
  headerHeight,
}: GanttTimelineHeaderProps): React.JSX.Element {
  let dayRowHeight = 20;
  if (zoom === 'month') {
    dayRowHeight = headerHeight;
  }

  const getDayLabel = (day: Date, i: number): string => {
    if (zoom === 'day') {
      return format(day, 'd');
    }
    if (zoom === 'week') {
      if (day.getDate() === 1 || i === 0) {
        return format(day, 'd MMM', { locale: ptBR });
      }
      if (day.getDate() % 7 === 0) {
        return format(day, 'd');
      }
      return '';
    }
    if (zoom === 'month') {
      if (day.getDate() === 1) {
        return format(day, 'MMM yy', { locale: ptBR });
      }
      return '';
    }
    return '';
  };

  return (
    <div
      data-slot="gantt-timeline-header"
      data-test-id="gantt-timeline-header"
      className="sticky top-0 z-10 border-b bg-background"
      style={{ height: headerHeight }}
    >
      {zoom !== 'month' && (
        <TimelineMonthHeaders
          days={days}
          dayWidth={dayWidth}
        />
      )}
      <div
        className="flex"
        style={{ height: dayRowHeight }}
      >
        {days.map((day, i) => (
          <div
            key={i}
            className={cn(
              'shrink-0 border-r text-center text-[10px] leading-5 text-muted-foreground',
              isToday(day) && 'bg-primary/10 font-bold text-primary',
              isWeekend(day) && 'bg-muted/30',
            )}
            style={{ width: dayWidth }}
          >
            {getDayLabel(day, i)}
          </div>
        ))}
      </div>
    </div>
  );
}
