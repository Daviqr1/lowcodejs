import {
  WEEKDAYS,
  getCalendarDays,
  isDateBetween,
  isDateDisabled,
  isSameDay,
  isToday,
} from './datepicker-utils';

import { cn } from '@/lib/utils';

type DatepickerDaysProps = {
  currentMonth: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  minDate?: Date | null;
  maxDate?: Date | null;
  // Range props
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  hoverDate?: Date | null;
  onDateHover?: (date: Date | null) => void;
  isRangeMode?: boolean;
};

export function DatepickerDays({
  currentMonth,
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  rangeStart,
  rangeEnd,
  hoverDate,
  onDateHover,
  isRangeMode = false,
}: DatepickerDaysProps): React.JSX.Element {
  const { previous, current, next } = getCalendarDays(currentMonth);

  const getDayClasses = (
    date: Date,
    isOutsideMonth: boolean,
    _disabled: boolean,
  ): string => {
    const today = isToday(date);

    // Single mode (backward compatibility)
    if (!isRangeMode) {
      const selected = isSameDay(date, selectedDate);
      return cn(
        'flex items-center justify-center size-9 text-sm rounded-md transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        'disabled:pointer-events-none disabled:opacity-50 disabled:line-through',
        isOutsideMonth && 'text-muted-foreground',
        today && !selected && 'border border-primary text-primary font-medium',
        selected &&
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
      );
    }

    // Range mode
    const isStart = isSameDay(date, rangeStart ?? null);
    const isEnd = isSameDay(date, rangeEnd ?? null);
    const isSameStartEnd = isStart && isEnd;

    // Check if date is in confirmed range
    const isInRange =
      rangeStart && rangeEnd && isDateBetween(date, rangeStart, rangeEnd);

    // Check if date is in hover preview range (when selecting)
    const isInHoverRange =
      rangeStart &&
      !rangeEnd &&
      hoverDate &&
      isDateBetween(date, rangeStart, hoverDate);

    // Check if this is the hover date
    const isHoverDate = hoverDate && isSameDay(date, hoverDate);

    return cn(
      'flex items-center justify-center size-9 text-sm transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
      'disabled:pointer-events-none disabled:opacity-50 disabled:line-through',
      isOutsideMonth && 'text-muted-foreground',

      // Default rounded
      'rounded-md',

      // Today styling (when not selected)
      today &&
        !isStart &&
        !isEnd &&
        'border border-primary text-primary font-medium',

      // Range start
      isStart &&
        !isSameStartEnd &&
        'bg-primary text-primary-foreground rounded-l-full rounded-r-none',

      // Range end
      isEnd &&
        !isSameStartEnd &&
        'bg-primary text-primary-foreground rounded-r-full rounded-l-none',

      // Same start and end (single day selected in range mode)
      isSameStartEnd && 'bg-primary text-primary-foreground rounded-full',

      // In confirmed range (middle)
      isInRange &&
        !isStart &&
        !isEnd &&
        'bg-primary/10 rounded-none hover:bg-primary/20',

      // Hover preview range (middle)
      isInHoverRange &&
        !isStart &&
        !isHoverDate &&
        'bg-primary/10 rounded-none',

      // Hover date (end preview)
      isHoverDate &&
        rangeStart &&
        !rangeEnd &&
        !isStart &&
        'bg-primary/20 rounded-r-full rounded-l-none',

      // Default hover (when not in range)
      !isStart &&
        !isEnd &&
        !isInRange &&
        !isInHoverRange &&
        'hover:bg-accent hover:text-accent-foreground',
    );
  };

  const renderDay = (
    date: Date,
    type: 'previous' | 'current' | 'next',
  ): React.JSX.Element => {
    const disabled = isDateDisabled(date, minDate, maxDate);
    const isOutsideMonth = type !== 'current';

    return (
      <button
        key={`${type}-${date.getTime()}`}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onSelectDate(date)}
        onMouseEnter={() => onDateHover?.(date)}
        onMouseLeave={() => onDateHover?.(null)}
        className={getDayClasses(date, isOutsideMonth, disabled)}
      >
        {date.getDate()}
      </button>
    );
  };

  return (
    <div
      data-slot="datepicker-days"
      data-test-id="datepicker-days"
      className="p-2"
    >
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="flex items-center justify-center size-9 text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {previous.map((date) => renderDay(date, 'previous'))}
        {current.map((date) => renderDay(date, 'current'))}
        {next.map((date) => renderDay(date, 'next'))}
      </div>
    </div>
  );
}
