import { Star } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { useRowUpdateEvaluation } from '@/hooks/tanstack-query/use-row-update-evaluation';
import { handleApiError } from '@/lib/handle-api-error';
import type { IEvaluationSummary, IField, IRow } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

interface TableRowEvaluationCellProps {
  size?: number;
  disabled?: boolean;
  className?: string;
  row: IRow;
  field: IField;
  tableSlug: string;
}

const MAX_RATING = 5;

export function TableRowEvaluationCell({
  size = 16,
  disabled = false,
  className,
  row,
  field,
  tableSlug,
}: TableRowEvaluationCellProps): React.JSX.Element {
  const summary: IEvaluationSummary = row[field.slug] ?? {};
  const average = summary._average ?? 0;
  const userValue = summary._userValue ?? null;
  const hasEvaluated = userValue !== null;

  const [hoverRating, setHoverRating] = React.useState(0);

  const evaluation = useRowUpdateEvaluation({
    onError(error) {
      handleApiError(error, { context: 'Erro ao avaliar' });
    },
  });

  let displayRating = hoverRating || average;
  if (userValue != null) {
    displayRating = userValue;
  }

  return (
    <div
      data-slot="table-row-evaluation-cell"
      data-test-id="evaluation-cell"
      className={cn('flex items-center gap-2', className)}
    >
      <div className="flex items-center gap-1">
        {Array.from({ length: MAX_RATING }, (_, index) => {
          const value = index + 1;
          const isFilled = hasEvaluated && value <= displayRating;

          return (
            <Button
              size="sm"
              variant="ghost"
              key={index}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                evaluation.mutate({
                  tableSlug,
                  rowId: row._id,
                  field: field.slug,
                  value,
                });
              }}
              onMouseEnter={() => !disabled && setHoverRating(value)}
              onMouseLeave={() => !disabled && setHoverRating(0)}
              disabled={disabled}
              className={cn(
                'p-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm',
                disabled && 'cursor-not-allowed opacity-50',
                !disabled && 'cursor-pointer hover:scale-110',
              )}
            >
              <Star
                size={size}
                className={cn(
                  'transition-colors',
                  isFilled && 'fill-yellow-400 text-yellow-400',
                  !isFilled &&
                    'fill-none text-gray-300 dark:text-gray-600 hover:text-yellow-400',
                )}
              />
            </Button>
          );
        })}
      </div>

      <span className="text-sm font-medium text-muted-foreground">
        {average.toFixed(1)}
      </span>
    </div>
  );
}
