import * as React from 'react';

import { getDropdownContrastStyle } from './utils';

import { Badge } from '@/components/ui/badge';
import type { IField, IRow } from '@/lib/interfaces';
import { getDropdownItem } from '@/lib/table';

interface TableRowDropdownCellProps {
  row: IRow;
  field: IField;
}

export function TableRowDropdownCell({
  field,
  row,
}: TableRowDropdownCellProps): React.JSX.Element {
  const raw = row[field.slug];
  let values: Array<string> = [];
  if (Array.isArray(raw)) {
    values = raw.filter((value): value is string => typeof value === 'string');
  }

  const items = values.map((value) =>
    getDropdownItem(field.dropdown ?? [], value),
  );

  if (items.length === 0) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <div
      data-slot="table-row-dropdown-cell"
      data-test-id="dropdown-cell"
      className="inline-flex flex-wrap gap-1"
    >
      {items.map((item, index) => {
        const style = getDropdownContrastStyle(item?.color);
        let badgeClassName: string | undefined = 'text-muted-foreground';
        if (style) badgeClassName = undefined;
        return (
          <Badge
            key={item?.id ?? index}
            variant="outline"
            className={badgeClassName}
            style={style}
          >
            {item?.label}
          </Badge>
        );
      })}
    </div>
  );
}
