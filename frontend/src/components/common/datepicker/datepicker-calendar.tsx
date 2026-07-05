import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { DatepickerDays } from './datepicker-days';
import { DatepickerMonths } from './datepicker-months';
import { getMonthShortName, navigateMonth } from './datepicker-utils';
import { DatepickerYears } from './datepicker-years';

import { Button } from '@/components/ui/button';

type View = 'days' | 'months' | 'years';

type DatepickerCalendarProps = {
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
  // Controlled month props (for dual calendar)
  displayMonth?: Date;
  onMonthChange?: (date: Date) => void;
  hideNavigation?: boolean;
};

export function DatepickerCalendar({
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  rangeStart,
  rangeEnd,
  hoverDate,
  onDateHover,
  isRangeMode = false,
  displayMonth,
  onMonthChange,
  hideNavigation = false,
}: DatepickerCalendarProps): React.JSX.Element {
  const [view, setView] = useState<View>('days');
  const [internalMonth, setInternalMonth] = useState<Date>(
    displayMonth || selectedDate || new Date(),
  );

  // Use controlled or internal month
  const currentMonth = displayMonth || internalMonth;

  const [yearRangeCenter, setYearRangeCenter] = useState<number>(
    currentMonth.getFullYear(),
  );

  const updateMonth = useCallback(
    (newMonth: Date) => {
      if (onMonthChange) {
        onMonthChange(newMonth);
      } else {
        setInternalMonth(newMonth);
      }
    },
    [onMonthChange],
  );

  const handlePrevMonth = useCallback(() => {
    updateMonth(navigateMonth(currentMonth, 'prev'));
  }, [currentMonth, updateMonth]);

  const handleNextMonth = useCallback(() => {
    updateMonth(navigateMonth(currentMonth, 'next'));
  }, [currentMonth, updateMonth]);

  const handleSelectMonth = useCallback(
    (month: number) => {
      updateMonth(new Date(currentMonth.getFullYear(), month, 1));
      setView('days');
    },
    [currentMonth, updateMonth],
  );

  const handleSelectYear = useCallback(
    (year: number) => {
      updateMonth(new Date(year, currentMonth.getMonth(), 1));
      setView('months');
    },
    [currentMonth, updateMonth],
  );

  const handleNavigateYears = useCallback((direction: 'prev' | 'next') => {
    setYearRangeCenter((prev) => {
      if (direction === 'next') return prev + 12;
      return prev - 12;
    });
  }, []);

  const handleSelectDate = useCallback(
    (date: Date) => {
      onSelectDate(date);
    },
    [onSelectDate],
  );

  const handleMonthClick = useCallback(() => {
    setView((prev) => {
      if (prev === 'months') return 'days';
      return 'months';
    });
  }, []);

  const handleYearClick = useCallback(() => {
    setYearRangeCenter(currentMonth.getFullYear());
    setView((prev) => {
      if (prev === 'years') return 'days';
      return 'years';
    });
  }, [currentMonth]);

  let minYear: number | null = null;
  if (minDate) {
    minYear = minDate.getFullYear();
  }
  let maxYear: number | null = null;
  if (maxDate) {
    maxYear = maxDate.getFullYear();
  }

  let monthButtonVariant: 'secondary' | 'ghost' = 'ghost';
  if (view === 'months') {
    monthButtonVariant = 'secondary';
  }

  let yearButtonVariant: 'secondary' | 'ghost' = 'ghost';
  if (view === 'years') {
    yearButtonVariant = 'secondary';
  }

  return (
    <div
      data-slot="datepicker-calendar"
      data-test-id="datepicker-calendar"
      className="w-70"
    >
      {/* Header with navigation */}
      <div className="flex items-center space-x-1.5 border border-border rounded-md px-2 py-1.5">
        {/* Left navigation - Prev month (days view) or Prev years (years view) */}
        <div className="flex-none">
          {view === 'days' && !hideNavigation && (
            <Button
              type="button"
              data-test-id="datepicker-prev-btn"
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              onClick={handlePrevMonth}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
          )}
          {view === 'years' && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              onClick={() => handleNavigateYears('prev')}
            >
              <ChevronsLeftIcon className="size-4" />
            </Button>
          )}
          {(view === 'months' || (view === 'days' && hideNavigation)) && (
            <div className="size-8" />
          )}
        </div>

        {/* Month and Year buttons - always visible */}
        <div className="flex flex-1 items-center space-x-1.5">
          <div className="w-1/2">
            <Button
              type="button"
              variant={monthButtonVariant}
              className="w-full h-8 font-medium"
              onClick={handleMonthClick}
            >
              {getMonthShortName(currentMonth.getMonth())}
            </Button>
          </div>
          <div className="w-1/2">
            <Button
              type="button"
              variant={yearButtonVariant}
              className="w-full h-8 font-medium"
              onClick={handleYearClick}
            >
              {currentMonth.getFullYear()}
            </Button>
          </div>
        </div>

        {/* Right navigation - Next month (days view) or Next years (years view) */}
        <div className="flex-none">
          {view === 'days' && !hideNavigation && (
            <Button
              type="button"
              data-test-id="datepicker-next-btn"
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              onClick={handleNextMonth}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          )}
          {view === 'years' && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              onClick={() => handleNavigateYears('next')}
            >
              <ChevronsRightIcon className="size-4" />
            </Button>
          )}
          {(view === 'months' || (view === 'days' && hideNavigation)) && (
            <div className="size-8" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[285px]">
        {view === 'days' && (
          <DatepickerDays
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            minDate={minDate}
            maxDate={maxDate}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            hoverDate={hoverDate}
            onDateHover={onDateHover}
            isRangeMode={isRangeMode}
          />
        )}

        {view === 'months' && (
          <DatepickerMonths
            currentMonth={currentMonth.getMonth()}
            onSelectMonth={handleSelectMonth}
          />
        )}

        {view === 'years' && (
          <DatepickerYears
            currentYear={currentMonth.getFullYear()}
            centerYear={yearRangeCenter}
            onSelectYear={handleSelectYear}
            minYear={minYear}
            maxYear={maxYear}
          />
        )}
      </div>
    </div>
  );
}
