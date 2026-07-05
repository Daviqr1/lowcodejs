import { generateYearRange } from './datepicker-utils';

import { cn } from '@/lib/utils';

type DatepickerYearsProps = {
  currentYear: number;
  centerYear: number;
  onSelectYear: (year: number) => void;
  minYear?: number | null;
  maxYear?: number | null;
};

export function DatepickerYears({
  currentYear,
  centerYear,
  onSelectYear,
  minYear,
  maxYear,
}: DatepickerYearsProps): React.JSX.Element {
  const years = generateYearRange(centerYear);

  return (
    <div
      data-slot="datepicker-years"
      data-test-id="datepicker-years"
      className="p-2"
    >
      {/* Years grid */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {years.map((year) => {
          const isSelected = currentYear === year;
          const isDisabled =
            (minYear !== null && minYear !== undefined && year < minYear) ||
            (maxYear !== null && maxYear !== undefined && year > maxYear);

          return (
            <button
              key={year}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelectYear(year)}
              className={cn(
                'flex items-center justify-center py-3 px-2 text-sm rounded-md transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'disabled:pointer-events-none disabled:opacity-50',
                isSelected &&
                  'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
              )}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );
}
