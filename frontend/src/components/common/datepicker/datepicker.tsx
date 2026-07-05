import { CalendarIcon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { DatepickerCalendar } from './datepicker-calendar';
import {
  formatDate,
  formatDateRange,
  isDateStringValid,
  navigateMonth,
  parseDate,
  parseDateRange,
} from './datepicker-utils';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Merge } from '@/lib/interfaces';

function applyDateMask(value: string, format: string): string {
  let separator = '-';
  if (format.includes('/')) {
    separator = '/';
  }
  const numbers = value.replace(/\D/g, '');
  const hasTime = format.includes('HH');
  let maxDigits = 8;
  if (hasTime) {
    maxDigits = 14;
  }
  const yearFirst = format.toLowerCase().startsWith('yyyy');

  let masked = '';
  for (let i = 0; i < Math.min(numbers.length, maxDigits); i++) {
    if (yearFirst) {
      if (i === 4 || i === 6) masked += separator;
    } else {
      if (i === 2 || i === 4) masked += separator;
    }
    if (hasTime && i === 8) masked += ' ';
    if (hasTime && (i === 10 || i === 12)) masked += ':';
    masked += numbers[i];
  }

  return masked;
}

function applyRangeMask(
  value: string,
  format: string,
  rangeSeparator: string,
): string {
  // Split by separator to handle each date independently
  const parts = value.split(rangeSeparator);

  if (parts.length === 1) {
    return applyDateMask(parts[0].trim(), format);
  }

  const start = applyDateMask(parts[0].trim(), format);
  const end = applyDateMask(parts.slice(1).join(rangeSeparator).trim(), format);

  if (end) {
    return `${start} ${rangeSeparator} ${end}`;
  }

  return start;
}

export type DatepickerValue = {
  startDate: Date | null;
  endDate: Date | null;
};

export type DatepickerProps = {
  value: DatepickerValue | null;
  onChange: (value: DatepickerValue | null) => void;
  displayFormat?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  minDate?: Date | null;
  maxDate?: Date | null;
  className?: string;
  // Range control props
  useRange?: boolean; // true = 2 calendars, false = 1 calendar (default: true)
  asSingle?: boolean; // true = single date (start=end), false = range (default: false)
  separator?: string; // separator in input (default: "~")
};

export type SingleDatepickerProps = Omit<
  DatepickerProps,
  'asSingle' | 'useRange' | 'separator'
>;

export type RangeDatepickerProps = Merge<
  Omit<DatepickerProps, 'asSingle' | 'useRange'>,
  {
    dualCalendar?: boolean;
  }
>;

export function SingleDatepicker(
  props: SingleDatepickerProps,
): React.JSX.Element {
  return (
    <Datepicker
      {...props}
      asSingle
      useRange={false}
    />
  );
}

export function RangeDatepicker({
  dualCalendar = true,
  ...props
}: RangeDatepickerProps): React.JSX.Element {
  return (
    <Datepicker
      {...props}
      asSingle={false}
      useRange={dualCalendar}
    />
  );
}

export function Datepicker({
  value,
  onChange,
  displayFormat = 'dd/MM/yyyy',
  placeholder,
  disabled = false,
  readOnly = false,
  required = false,
  minDate,
  maxDate,
  className,
  useRange = true,
  asSingle = false,
  separator = '~',
}: DatepickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Range selection state
  const [rangeStart, setRangeStart] = useState<Date | null>(
    value?.startDate || null,
  );
  const [rangeEnd, setRangeEnd] = useState<Date | null>(value?.endDate || null);

  // For dual calendar, track left calendar month
  const [leftCalendarMonth, setLeftCalendarMonth] = useState<Date>(
    value?.startDate || new Date(),
  );

  // Generate input value from current value
  const getInputValue = useCallback(() => {
    if (!value?.startDate && !value?.endDate) return '';

    if (asSingle) {
      return formatDate(value.startDate, displayFormat);
    }

    return formatDateRange(
      value.startDate,
      value.endDate,
      displayFormat,
      separator,
    );
  }, [value, asSingle, displayFormat, separator]);

  const [inputValue, setInputValue] = useState<string>(getInputValue());

  // Sync input value when external value changes
  useEffect(() => {
    setInputValue(getInputValue());
    setRangeStart(value?.startDate || null);
    setRangeEnd(value?.endDate || null);
    if (value?.startDate) {
      setLeftCalendarMonth(value.startDate);
    }
  }, [value, getInputValue]);

  // Reset range selection when popover closes
  useEffect(() => {
    if (!open) {
      setHoverDate(null);
      // Reset to confirmed value
      setRangeStart(value?.startDate || null);
      setRangeEnd(value?.endDate || null);
    }
  }, [open, value]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      if (asSingle) {
        const masked = applyDateMask(raw, displayFormat);
        setInputValue(masked);

        if (masked === '') {
          onChange(null);
          return;
        }

        if (masked.length === displayFormat.length) {
          const parsed = parseDate(masked, displayFormat);
          if (parsed && isDateStringValid(masked, displayFormat)) {
            onChange({ startDate: parsed, endDate: parsed });
          }
        }
      } else {
        const masked = applyRangeMask(raw, displayFormat, separator);
        setInputValue(masked);

        if (masked === '') {
          onChange(null);
          return;
        }

        const expectedLength =
          displayFormat.length * 2 + ` ${separator} `.length;
        if (masked.length >= expectedLength) {
          const { startDate, endDate } = parseDateRange(
            masked,
            displayFormat,
            separator,
          );
          if (startDate && endDate) {
            onChange({ startDate, endDate });
          }
        }
      }
    },
    [onChange, displayFormat, asSingle, separator],
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setInputValue('');
    setRangeStart(null);
    setRangeEnd(null);
  }, [onChange]);

  const handleInputBlur = useCallback(() => {
    if (inputValue === '') {
      onChange(null);
      return;
    }

    // Reset to current value if input is invalid
    setInputValue(getInputValue());
  }, [inputValue, onChange, getInputValue]);

  const handleSelectDate = useCallback(
    (date: Date) => {
      if (asSingle) {
        // Single mode: immediately set start = end
        onChange({ startDate: date, endDate: date });
        setInputValue(formatDate(date, displayFormat));
        setOpen(false);
      } else {
        // Range mode
        if (!rangeStart || rangeEnd) {
          // Start new selection
          setRangeStart(date);
          setRangeEnd(null);
        } else {
          // Complete the range
          let start = rangeStart;
          let end = date;

          // Swap if end is before start
          if (end < start) {
            [start, end] = [end, start];
          }

          setRangeStart(start);
          setRangeEnd(end);
          onChange({ startDate: start, endDate: end });
          setInputValue(formatDateRange(start, end, displayFormat, separator));
          setOpen(false);
        }
      }
    },
    [asSingle, rangeStart, rangeEnd, onChange, displayFormat, separator],
  );

  const handleDateHover = useCallback((date: Date | null) => {
    setHoverDate(date);
  }, []);

  const handlePrevMonth = useCallback(() => {
    setLeftCalendarMonth((prev) => navigateMonth(prev, 'prev'));
  }, []);

  const handleNextMonth = useCallback(() => {
    setLeftCalendarMonth((prev) => navigateMonth(prev, 'next'));
  }, []);

  // Compute right calendar month (1 month after left)
  const rightCalendarMonth = navigateMonth(leftCalendarMonth, 'next');

  // Determine if we're in range selection mode (selecting second date)
  const isSelectingRange = !asSingle && rangeStart && !rangeEnd;

  // Get placeholder text
  const getPlaceholder = (): string => {
    if (placeholder) return placeholder;
    if (asSingle) return 'Selecione uma data';
    return `dd/mm/aaaa ${separator} dd/mm/aaaa`;
  };

  // Hover date for range selection preview
  let activeHoverDate: Date | null = null;
  if (isSelectingRange) {
    activeHoverDate = hoverDate;
  }

  // Selected date for single mode
  let singleSelectedDate: Date | null = null;
  if (asSingle) {
    singleSelectedDate = value?.startDate || null;
  }

  // Check if we have a value to show clear button
  const hasValue = value?.startDate || value?.endDate;

  return (
    <InputGroup
      data-slot="datepicker"
      data-test-id="datepicker"
      data-disabled={disabled}
      className={className}
    >
      <InputGroupInput
        data-test-id="datepicker-input"
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder={getPlaceholder()}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
      />
      <InputGroupAddon align="inline-end">
        {hasValue && !disabled && !readOnly && (
          <InputGroupButton
            size="icon-xs"
            onClick={handleClear}
            aria-label="Limpar data"
          >
            <XIcon className="size-3.5" />
          </InputGroupButton>
        )}
        <Popover
          open={open}
          onOpenChange={setOpen}
        >
          <PopoverTrigger asChild>
            <InputGroupButton
              data-test-id="datepicker-calendar-btn"
              size="icon-xs"
              disabled={disabled || readOnly}
              aria-label="Abrir calendário"
            >
              <CalendarIcon className="size-4" />
            </InputGroupButton>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="end"
            sideOffset={8}
          >
            {useRange && (
              // Dual calendar layout
              <div className="flex">
                {/* Left calendar */}
                <div className="relative">
                  <DatepickerCalendar
                    selectedDate={singleSelectedDate}
                    onSelectDate={handleSelectDate}
                    minDate={minDate}
                    maxDate={maxDate}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    hoverDate={activeHoverDate}
                    onDateHover={handleDateHover}
                    isRangeMode={!asSingle}
                    displayMonth={leftCalendarMonth}
                    onMonthChange={setLeftCalendarMonth}
                    hideNavigation
                  />
                  {/* Navigation - prev month */}
                  <button
                    type="button"
                    data-test-id="datepicker-prev-btn"
                    onClick={handlePrevMonth}
                    className="absolute left-4 top-3 size-8 flex items-center justify-center rounded-full hover:bg-accent"
                  >
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Vertical separator */}
                <div className="w-px bg-border my-2" />

                {/* Right calendar */}
                <div className="relative">
                  <DatepickerCalendar
                    selectedDate={singleSelectedDate}
                    onSelectDate={handleSelectDate}
                    minDate={minDate}
                    maxDate={maxDate}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    hoverDate={activeHoverDate}
                    onDateHover={handleDateHover}
                    isRangeMode={!asSingle}
                    displayMonth={rightCalendarMonth}
                    hideNavigation
                  />
                  {/* Navigation - next month */}
                  <button
                    type="button"
                    data-test-id="datepicker-next-btn"
                    onClick={handleNextMonth}
                    className="absolute right-4 top-3 size-8 flex items-center justify-center rounded-full hover:bg-accent"
                  >
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            {!useRange && (
              // Single calendar layout
              <DatepickerCalendar
                selectedDate={singleSelectedDate}
                onSelectDate={handleSelectDate}
                minDate={minDate}
                maxDate={maxDate}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                hoverDate={activeHoverDate}
                onDateHover={handleDateHover}
                isRangeMode={!asSingle}
              />
            )}
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
}
