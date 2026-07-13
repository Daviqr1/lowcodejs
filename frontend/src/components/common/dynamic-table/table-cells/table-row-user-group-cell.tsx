import { TableRowBadgeList } from './table-row-badge-list';

import { USER_GROUP_MAPPER } from '@/lib/constant';
import type { IField, IGroup, IRow } from '@/lib/interfaces';

type TableRowUserGroupCellProps = {
  row: IRow;
  field: IField;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Nome amigável para grupos de sistema (Master/Administrador/...); senão o nome.
function resolveGroupLabel(group: Record<string, unknown>): string {
  const slug = group.slug;
  if (typeof slug === 'string') {
    for (const [systemSlug, label] of Object.entries(USER_GROUP_MAPPER)) {
      if (systemSlug === slug) return label;
    }
  }
  if (typeof group.name === 'string') return group.name;
  if (typeof group._id === 'string') return group._id;
  return '';
}

export function TableRowUserGroupCell({
  field,
  row,
}: TableRowUserGroupCellProps): React.JSX.Element {
  const raw = row[field.slug];
  let values: Array<IGroup> = [];
  if (Array.isArray(raw)) {
    values = raw.filter((item): item is IGroup => isRecord(item));
  }

  return (
    <TableRowBadgeList
      data-slot="table-row-user-group-cell"
      data-test-id="user-group-cell"
      values={values}
      renderLabel={(group) => resolveGroupLabel(group)}
      getKey={(group) => group._id}
    />
  );
}
