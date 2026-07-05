import {
  addDays,
  max as dateMax,
  min as dateMin,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameWeek,
  isToday,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React from 'react';

import {
  eventOccursOnDay,
  formatEventTimeRange,
  isMultiDayCalendarEvent,
} from '@/lib/calendar-helpers';
import type { CalendarEventItem } from '@/lib/calendar-helpers';
import { cn } from '@/lib/utils';

const HOUR_HEIGHT = 56;

type TimedEventLayout = {
  event: CalendarEventItem;
  lane: number;
  laneCount: number;
  top: number;
  height: number;
};

function clampTimedRange(
  event: CalendarEventItem,
  day: Date,
): { start: Date; end: Date } {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  return {
    start: dateMax([event.start, dayStart]),
    end: dateMin([event.end, dayEnd]),
  };
}

function overlaps(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start < b.end && a.end > b.start;
}

function buildTimedLayouts(
  day: Date,
  events: Array<CalendarEventItem>,
): Array<TimedEventLayout> {
  const sameDayEvents = events
    .filter(
      (event) =>
        eventOccursOnDay(event, day) && !isMultiDayCalendarEvent(event),
    )
    .map((event) => {
      const { start, end } = clampTimedRange(event, day);
      return { event, startMs: start.getTime(), endMs: end.getTime() };
    })
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  const lanes: Array<number> = [];
  const assigned = sameDayEvents.map((item) => {
    let lane = 0;
    while (lane < lanes.length && lanes[lane] > item.startMs) lane += 1;
    lanes[lane] = item.endMs;
    return { ...item, lane };
  });

  return assigned.map((item) => {
    const overlapping = assigned.filter((other) =>
      overlaps(
        { start: item.startMs, end: item.endMs },
        { start: other.startMs, end: other.endMs },
      ),
    );
    const laneCount = Math.max(
      1,
      ...overlapping.map((overlap) => overlap.lane + 1),
    );
    const minutesFromStart = (item.startMs - startOfDay(day).getTime()) / 60000;
    const durationMinutes = Math.max(15, (item.endMs - item.startMs) / 60000);

    return {
      event: item.event,
      lane: item.lane,
      laneCount,
      top: (minutesFromStart / 60) * HOUR_HEIGHT,
      height: (durationMinutes / 60) * HOUR_HEIGHT,
    };
  });
}

type CalendarWeekViewProps = {
  currentDate: Date;
  events: Array<CalendarEventItem>;
  onSelectEvent: (event: CalendarEventItem) => void;
};

export function CalendarWeekView({
  currentDate,
  events,
  onSelectEvent,
}: CalendarWeekViewProps): React.JSX.Element {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = React.useRef<string | null>(null);
  const [scrollbarWidth, setScrollbarWidth] = React.useState(0);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hourLabels = Array.from({ length: 24 }, (_, hour) => hour);
  const allDayByDay = new Map(
    days.map((day) => [
      day.toDateString(),
      events.filter(
        (event) =>
          eventOccursOnDay(event, day) && isMultiDayCalendarEvent(event),
      ),
    ]),
  );
  const timedLayoutsByDay = new Map(
    days.map((day) => [day.toDateString(), buildTimedLayouts(day, events)]),
  );

  React.useEffect((): void | (() => void) => {
    const measure = (): void => {
      const container = scrollRef.current;
      if (!container) return;
      setScrollbarWidth(
        Math.max(0, container.offsetWidth - container.clientWidth),
      );
    };

    measure();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
  }, []);

  React.useEffect((): void => {
    const container = scrollRef.current;
    if (!container) return;

    const key = `${weekStart.toISOString()}-${events.length}`;
    if (hasAutoScrolledRef.current === key) return;

    const now = new Date();
    const nextEventThisWeek = events.find(
      (event) =>
        event.start.getTime() >= now.getTime() &&
        isSameWeek(event.start, currentDate, { weekStartsOn: 1 }),
    );

    let targetMinutes = 0;
    if (nextEventThisWeek) {
      const eventMinutes =
        nextEventThisWeek.start.getHours() * 60 +
        nextEventThisWeek.start.getMinutes();
      targetMinutes = Math.max(0, eventMinutes - 120);
    } else if (isSameWeek(now, currentDate, { weekStartsOn: 1 })) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      targetMinutes = Math.max(0, nowMinutes - 120);
    } else {
      targetMinutes = 6 * 60;
    }

    const targetScrollTop = Math.max(0, (targetMinutes / 60) * HOUR_HEIGHT - 8);
    container.scrollTop = targetScrollTop;
    hasAutoScrolledRef.current = key;
  }, [currentDate, events, weekStart]);

  return (
    <div
      data-slot="calendar-week-view"
      data-test-id="calendar-week-view"
      className="flex h-full min-h-0 flex-col"
    >
      <div
        className="border-b"
        style={{ paddingRight: scrollbarWidth }}
      >
        <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))]">
          <div className="border-r px-2 py-3 text-xs text-muted-foreground">
            Dia
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="border-r px-2 py-2 last:border-r-0"
            >
              <div className="text-xs text-muted-foreground">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div
                className={cn(
                  'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-sm font-semibold',
                  isToday(day) && 'bg-primary text-primary-foreground',
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="border-b bg-muted/10"
        style={{ paddingRight: scrollbarWidth }}
      >
        <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))]">
          <div className="border-r px-2 py-2 text-xs text-muted-foreground">
            Dia Inteiro
          </div>
          {days.map((day) => {
            const items = allDayByDay.get(day.toDateString()) ?? [];
            return (
              <div
                key={`allday-${day.toISOString()}`}
                className="min-h-14 space-y-1 border-r p-1 last:border-r-0"
              >
                {items.slice(0, 2).map((event) => (
                  <button
                    key={`${event.rowId}-allday-${day.toISOString()}`}
                    type="button"
                    className="block w-full cursor-pointer truncate rounded px-2 py-1 text-left text-xs font-medium text-white"
                    style={{ backgroundColor: event.color }}
                    onClick={() => onSelectEvent(event)}
                  >
                    {event.title}
                  </button>
                ))}
                {items.length > 2 && (
                  <div className="px-1 text-[10px] text-muted-foreground">
                    +{items.length - 2} mais
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto"
      >
        <div
          className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))]"
          style={{ minHeight: HOUR_HEIGHT * 24 }}
        >
          <div className="relative border-r">
            {hourLabels.map((hour) => (
              <div
                key={hour}
                className="border-b px-2 text-[11px] text-muted-foreground"
                style={{ height: HOUR_HEIGHT }}
              >
                <div className="pt-1 leading-none">
                  {String(hour).padStart(2, '0')}:00
                </div>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const layouts = timedLayoutsByDay.get(day.toDateString()) ?? [];
            return (
              <div
                key={`timed-${day.toISOString()}`}
                className="relative border-r last:border-r-0"
                style={{ height: HOUR_HEIGHT * 24 }}
              >
                {hourLabels.map((hour) => (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="border-b"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {layouts.map((layout) => {
                  const width = 100 / layout.laneCount;
                  const left = layout.lane * width;

                  return (
                    <button
                      key={`${layout.event.rowId}-${layout.top}`}
                      type="button"
                      className="absolute z-10 cursor-pointer overflow-hidden rounded-md border px-2 py-1 text-left text-white shadow-sm"
                      style={{
                        top: layout.top + 1,
                        left: `calc(${left}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                        height: Math.max(20, layout.height - 2),
                        backgroundColor: layout.event.color,
                        borderColor: layout.event.color,
                      }}
                      onClick={() => onSelectEvent(layout.event)}
                      title={`${layout.event.title} • ${formatEventTimeRange(layout.event)}`}
                    >
                      <div className="truncate text-xs font-semibold">
                        {layout.event.title}
                      </div>
                      <div className="truncate text-[10px] opacity-90">
                        {formatEventTimeRange(layout.event)}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
