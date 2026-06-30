import React from 'react';

import { statusClassName } from './-constants';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: number }): React.JSX.Element {
  return (
    <Badge
      className={cn(
        'font-semibold border-transparent',
        statusClassName(status),
      )}
    >
      {status}
    </Badge>
  );
}
