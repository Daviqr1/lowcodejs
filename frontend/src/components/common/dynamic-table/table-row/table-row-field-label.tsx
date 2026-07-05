import { CircleHelpIcon } from 'lucide-react';

import { FieldLabel } from '@/components/ui/field';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { IField } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';
import { cn } from '@/lib/utils';

type TableRowFieldLabelProps = {
  field: IField;
  htmlFor?: string;
  className?: string;
};

export function TableRowFieldLabel({
  field,
  htmlFor,
  className,
}: TableRowFieldLabelProps): React.JSX.Element {
  const tip = field.tip?.trim();
  const displayLabel = resolveFieldLabel(field, 'form');

  return (
    <div className="flex items-center justify-between gap-2">
      <FieldLabel
        htmlFor={htmlFor}
        className={className}
      >
        {displayLabel}
        {field.required && <span className="text-destructive"> *</span>}
      </FieldLabel>

      {tip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Dica de ${displayLabel}`}
              className={cn(
                'text-muted-foreground hover:text-foreground focus-visible:ring-ring',
                'inline-flex size-5 items-center justify-center rounded-sm',
                'outline-none transition-colors focus-visible:ring-2',
              )}
            >
              <CircleHelpIcon className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="end"
            sideOffset={6}
            className="max-w-72 whitespace-normal text-left leading-relaxed"
          >
            {tip}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
