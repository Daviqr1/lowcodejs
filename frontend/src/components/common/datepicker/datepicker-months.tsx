import { MONTHS_SHORT } from './datepicker-utils';

import { cn } from '@/lib/utils';

type DatepickerMonthsProps = {
  currentMonth: number;
  onSelectMonth: (month: number) => void;
};

export function DatepickerMonths({
  currentMonth,
  onSelectMonth,
}: DatepickerMonthsProps): React.JSX.Element {
  return (
    <div
      data-slot="datepicker-months"
      data-test-id="datepicker-months"
      className="p-2"
    >
      <div className="grid grid-cols-2 gap-2 mt-2">
        {MONTHS_SHORT.map((month, index) => {
          const isSelected = currentMonth === index;

          return (
            <button
              key={month}
              type="button"
              onClick={() => onSelectMonth(index)}
              className={cn(
                'flex items-center justify-center py-3 px-2 text-sm rounded-md transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                isSelected &&
                  'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
              )}
            >
              {month}
            </button>
          );
        })}
      </div>
    </div>
  );
}
