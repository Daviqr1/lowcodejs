import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const DEFAULT_FIELD_TITLE_MAX_LENGTH = 30;

export function truncateFieldTitle(
  value: string,
  maxLength = DEFAULT_FIELD_TITLE_MAX_LENGTH,
): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

type FieldTitleProps = {
  value: string;
  maxLength?: number;
  className?: string;
};

export function FieldTitle({
  value,
  maxLength = DEFAULT_FIELD_TITLE_MAX_LENGTH,
  className,
}: FieldTitleProps): React.JSX.Element {
  const truncated = truncateFieldTitle(value, maxLength);
  const shouldShowTooltip = truncated !== value;

  const label = (
    <span className={cn('min-w-0 break-words', className)}>{truncated}</span>
  );

  if (!shouldShowTooltip) return label;

  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-normal text-left">
        {value}
      </TooltipContent>
    </Tooltip>
  );
}
