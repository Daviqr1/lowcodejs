import * as React from 'react';

import { badgeStyleFromColor } from './utils';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TableRowBadgeListProps<T> = {
  values: Array<T>;
  renderLabel: (value: T, index: number) => React.ReactNode;
  getKey?: (value: T, index: number) => string | number;
  getColor?: (value: T, index: number) => string | null | undefined;
};

export function TableRowBadgeList<T>({
  values,
  renderLabel,
  getKey = (_: T, i: number): string | number => i,
  getColor,
}: TableRowBadgeListProps<T>): React.JSX.Element {
  if (values.length === 0) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <div
      data-slot="table-row-badge-list"
      data-test-id="badge-list"
      className="inline-flex flex-wrap gap-1"
    >
      {values.map((value, index) => {
        const color = getColor?.(value, index);
        const style = badgeStyleFromColor(color);
        return (
          <Badge
            key={getKey(value, index)}
            variant="outline"
            className={cn(!style && 'text-muted-foreground')}
            style={style}
          >
            {renderLabel(value, index)}
          </Badge>
        );
      })}
    </div>
  );
}
