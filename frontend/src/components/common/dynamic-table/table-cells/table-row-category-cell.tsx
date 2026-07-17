import { TableRowBadgeList } from './table-row-badge-list';

import type { IField, IRow } from '@/lib/interfaces';
import { getCategoryItem } from '@/lib/table';

type TableRowCategoryCellProps = {
  row: IRow;
  field: IField;
};

export function TableRowCategoryCell({
  field,
  row,
}: TableRowCategoryCellProps): React.JSX.Element {
  const raw = row[field.slug];
  let values: Array<string> = [];
  if (Array.isArray(raw)) {
    values = raw.filter((value): value is string => typeof value === 'string');
  }
  const items = values.map((value) =>
    getCategoryItem(field.category ?? [], value),
  );

  return (
    <TableRowBadgeList
      data-slot="table-row-category-cell"
      data-test-id="category-cell"
      values={items}
      renderLabel={(item) => item?.label}
      getKey={(item) => item?.id ?? ''}
    />
  );
}
