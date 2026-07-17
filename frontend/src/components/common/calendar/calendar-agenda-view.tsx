import { format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import type { CalendarEventItem } from '@/lib/calendar-helpers';

type CalendarAgendaViewProps = {
  events: Array<CalendarEventItem>;
  onSelectEvent: (event: CalendarEventItem) => void;
};

export function CalendarAgendaView({
  events,
  onSelectEvent,
}: CalendarAgendaViewProps): React.JSX.Element {
  if (events.length === 0) {
    return (
      <div
        data-slot="calendar-agenda-view"
        data-test-id="calendar-agenda-view"
        className="p-6 text-sm text-muted-foreground"
      >
        Nenhum agendamento com data válida para exibir.
      </div>
    );
  }

  let lastDay: Date | null = null;

  return (
    <div
      data-slot="calendar-agenda-view"
      data-test-id="calendar-agenda-view"
      className="h-full overflow-auto"
    >
      <div className="divide-y">
        {events.map((event) => {
          const day = startOfDay(event.start);
          const showHeader = !lastDay || !isSameDay(lastDay, day);
          lastDay = day;

          let endDateLabel = format(event.end, 'dd/MM/yyyy HH:mm');
          if (isSameDay(event.start, event.end)) {
            endDateLabel = format(event.end, 'HH:mm');
          }

          return (
            <div key={event.rowId}>
              {showHeader && (
                <div className="sticky top-0 z-10 border-y bg-background/95 px-4 py-2 text-sm font-medium backdrop-blur supports-[backdrop-filter]:bg-background/70">
                  {format(day, "EEE, dd 'de' MMMM", { locale: ptBR })}
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full cursor-pointer justify-start rounded-none px-4 py-3 text-left hover:bg-muted/40"
                onClick={() => onSelectEvent(event)}
              >
                <div className="flex w-full items-start gap-3">
                  <span
                    className="mt-1 size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{event.title}</div>
                    <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground/70">
                          Data:
                        </span>{' '}
                        {format(event.start, 'dd/MM/yyyy', { locale: ptBR })}
                        {', '}
                        {format(event.start, 'HH:mm')}
                        {' - '}
                        {endDateLabel}
                      </div>
                      {event.participants.length > 0 && (
                        <div>
                          <span className="font-medium text-foreground/70">
                            Participantes:
                          </span>{' '}
                          {event.participants
                            .map((p) => p.name.trim())
                            .join(', ')}
                        </div>
                      )}
                      {event.description && (
                        <div className="line-clamp-2">
                          <span className="font-medium text-foreground/70">
                            Descrição:
                          </span>{' '}
                          {event.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
