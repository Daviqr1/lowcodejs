import * as Toggle from '@radix-ui/react-toggle';
import type { LucideIcon } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type ToolbarButtonProps = {
  icon?: LucideIcon;
  tooltip?: string;
  action?: () => void;
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function ToolbarButton({
  icon: Icon,
  tooltip,
  action,
  isActive = false,
  disabled = false,
  className,
  children,
}: ToolbarButtonProps): React.JSX.Element {
  const button = (
    <Toggle.Root
      data-slot="editor-toolbar-button"
      pressed={isActive}
      onPressedChange={() => action?.()}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-md size-8 text-sm',
        'hover:bg-accent hover:text-accent-foreground',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
        'cursor-pointer transition-colors',
        className,
      )}
    >
      {Icon && <Icon className="size-4" />}
      {children}
    </Toggle.Root>
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
