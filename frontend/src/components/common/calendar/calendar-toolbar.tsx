import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutDashboardIcon,
  LayoutListIcon,
} from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type CalendarViewMode = 'week' | 'month' | 'agenda';

type CalendarToolbarProps = {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeView: (mode: CalendarViewMode) => void;
  onSelectDate: (date: Date) => void;
};

function getTitle(currentDate: Date, viewMode: CalendarViewMode): string {
  if (viewMode === 'month') {
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  }

  if (viewMode === 'agenda') {
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  }

  return format(currentDate, "dd 'de' MMM yyyy", { locale: ptBR });
}

function toMonthInputValue(date: Date): string {
  return format(date, 'yyyy-MM');
}

function toWeekInputValue(date: Date): string {
  const year = getISOWeekYear(date);
  const week = String(getISOWeek(date)).padStart(2, '0');
  return `${year}-W${week}`;
}

function parseMonthInputValue(value: string): Date | null {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return null;
  return new Date(year, month - 1, 1);
}

function parseWeekInputValue(value: string): Date | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(week)) return null;
  if (week < 1 || week > 53) return null;

  // ISO week 1 is the week containing Jan 4th; anchor at UTC to avoid TZ drift.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // Sunday => 7
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  mondayWeek1.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);

  return new Date(
    mondayWeek1.getUTCFullYear(),
    mondayWeek1.getUTCMonth(),
    mondayWeek1.getUTCDate(),
  );
}

export function CalendarToolbar({
  currentDate,
  viewMode,
  onPrevious,
  onNext,
  onToday,
  onChangeView,
  onSelectDate,
}: CalendarToolbarProps): React.JSX.Element {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const [monthValue, setMonthValue] = React.useState(() =>
    toMonthInputValue(currentDate),
  );
  const [weekValue, setWeekValue] = React.useState(() =>
    toWeekInputValue(currentDate),
  );

  React.useEffect(() => {
    setMonthValue(toMonthInputValue(currentDate));
    setWeekValue(toWeekInputValue(currentDate));
  }, [currentDate]);

  const canPickDirectly = viewMode === 'month' || viewMode === 'week';

  const applyDirectSelection = React.useCallback(() => {
    if (viewMode === 'month') {
      const parsed = parseMonthInputValue(monthValue);
      if (parsed) {
        onSelectDate(parsed);
        setIsPickerOpen(false);
      }
      return;
    }

    if (viewMode === 'week') {
      const parsed = parseWeekInputValue(weekValue);
      if (parsed) {
        onSelectDate(parsed);
        setIsPickerOpen(false);
      }
    }
  }, [monthValue, onSelectDate, viewMode, weekValue]);

  return (
    <div
      data-slot="calendar-toolbar"
      data-test-id="calendar-toolbar"
      className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-2">
        <Button
          data-test-id="calendar-today-btn"
          variant="outline"
          size="sm"
          onClick={onToday}
          className="cursor-pointer shadow-none"
        >
          Hoje
        </Button>
        <Button
          data-test-id="calendar-prev-btn"
          variant="ghost"
          size="icon-sm"
          onClick={onPrevious}
          className="cursor-pointer"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button
          data-test-id="calendar-next-btn"
          variant="ghost"
          size="icon-sm"
          onClick={onNext}
          className="cursor-pointer"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
        {canPickDirectly && (
          <Popover
            open={isPickerOpen}
            onOpenChange={setIsPickerOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-8 cursor-pointer px-2 text-sm font-medium capitalize"
              >
                {getTitle(currentDate, viewMode)}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-64 space-y-3"
            >
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  {viewMode === 'month' && 'Selecionar mês e ano'}
                  {viewMode !== 'month' && 'Selecionar semana'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {viewMode === 'month' && 'Escolha diretamente o mês/ano.'}
                  {viewMode !== 'month' && 'Escolha uma semana do ano.'}
                </div>
              </div>

              {viewMode === 'month' && (
                <Input
                  type="month"
                  value={monthValue}
                  onChange={(event) => setMonthValue(event.target.value)}
                />
              )}
              {viewMode !== 'month' && (
                <Input
                  type="week"
                  value={weekValue}
                  onChange={(event) => setWeekValue(event.target.value)}
                />
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setIsPickerOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer"
                  onClick={applyDirectSelection}
                >
                  Aplicar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
        {!canPickDirectly && (
          <div className="ml-1 text-sm font-medium capitalize">
            {getTitle(currentDate, viewMode)}
          </div>
        )}
      </div>

      <div className="inline-flex items-center gap-1 rounded-md border bg-muted/30 p-1">
        {(
          [
            { mode: 'agenda', label: 'Agenda', icon: LayoutListIcon },
            { mode: 'month', label: 'Mês', icon: CalendarIcon },
            { mode: 'week', label: 'Semana', icon: LayoutDashboardIcon },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const isActive = viewMode === item.mode;
          let buttonVariant: 'default' | 'ghost' = 'ghost';
          if (isActive) {
            buttonVariant = 'default';
          }
          return (
            <Button
              key={item.mode}
              type="button"
              variant={buttonVariant}
              size="sm"
              className={cn(
                'cursor-pointer shadow-none',
                !isActive && 'text-muted-foreground',
              )}
              onClick={() => onChangeView(item.mode)}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
