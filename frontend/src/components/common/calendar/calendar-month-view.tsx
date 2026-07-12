import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { eventOccursOnDay, formatEventTimeRange } from '@/lib/calendar-helpers';
import type { CalendarEventItem } from '@/lib/calendar-helpers';
import { cn } from '@/lib/utils';

type CalendarMonthViewProps = {
  currentDate: Date;
  events: Array<CalendarEventItem>;
  onSelectEvent: (event: CalendarEventItem) => void;
};

export function CalendarMonthView({
  currentDate,
  events,
  onSelectEvent,
}: CalendarMonthViewProps): React.JSX.Element {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div
      data-slot="calendar-month-view"
      data-test-id="calendar-month-view"
      className="flex h-full min-h-0 flex-col"
    >
      <div className="grid grid-cols-7 border-b text-xs font-medium text-muted-foreground">
        {Array.from({ length: 7 }).map((_, index) => {
          const day = days[index];
          return (
            <div
              key={index}
              className="border-r px-2 py-2 last:border-r-0"
            >
              {format(day, 'EEE', { locale: ptBR })}
            </div>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const dayEvents = events.filter((event) =>
            eventOccursOnDay(event, day),
          );
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-16 border-r border-b p-1 align-top sm:min-h-28',
                !isSameMonth(day, currentDate) && 'bg-muted/20',
              )}
            >
              <div className="mb-1 flex items-center justify-between px-1">
                <span
                  className={cn(
                    'inline-flex size-6 items-center justify-center rounded-full text-xs',
                    isToday(day) && 'bg-primary text-primary-foreground',
                    !isToday(day) &&
                      !isSameMonth(day, currentDate) &&
                      'text-muted-foreground',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => {
                  const startsToday = isSameDay(event.start, day);
                  let timeLabel = 'Continua';
                  if (startsToday) {
                    timeLabel = formatEventTimeRange(event);
                  }
                  return (
                    <Button
                      key={`${event.rowId}-${day.toISOString()}`}
                      type="button"
                      variant="ghost"
                      className="h-auto w-full cursor-pointer justify-start rounded-sm px-1.5 py-1 text-left hover:bg-muted/40"
                      onClick={() => onSelectEvent(event)}
                    >
                      <div className="flex min-w-0 items-start gap-1.5">
                        <span
                          className="mt-1 size-2 rounded-full"
                          style={{ backgroundColor: event.color }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium leading-4">
                            {event.title}
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            {timeLabel}
                          </div>
                        </div>
                      </div>
                    </Button>
                  );
                })}

                {dayEvents.length > 3 && (
                  <div className="px-1.5 text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
