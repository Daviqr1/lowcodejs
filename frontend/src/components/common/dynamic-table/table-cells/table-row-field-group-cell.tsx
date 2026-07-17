import React from 'react';

import { GroupRowsDataTable } from '../group-rows/group-rows-data-table';

import { Badge } from '@/components/ui/badge';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useTablePermission } from '@/hooks/use-table-permission';
import type { IField, IRow, ITable } from '@/lib/interfaces';

type TableRowFieldGroupCellProps = {
  row: IRow;
  field: IField;
  tableSlug: string;
  table?: ITable;
  variant?: 'cell' | 'detail';
};

export function TableRowFieldGroupCell({
  field,
  row,
  tableSlug,
  table: tableProp,
  variant = 'cell',
}: TableRowFieldGroupCellProps): React.JSX.Element {
  const groupSlug = field?.group?.slug;
  const tableQuery = useReadTable({ slug: tableSlug });
  const table = tableProp ?? tableQuery.data;
  const permission = useTablePermission(table);
  const canManage = permission.can('UPDATE_FIELD');

  if (!field) return <span className="text-muted-foreground text-sm">-</span>;

  if (!groupSlug || !table) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  if (variant === 'detail') {
    return (
      <GroupRowsDataTable
        tableSlug={tableSlug}
        rowId={row._id}
        field={field}
        table={table}
        canManage={canManage}
      />
    );
  }

  const groupData = row?.[field.slug] ?? [];
  let total = 0;
  if (Array.isArray(groupData)) {
    total = groupData.length;
  }

  if (total === 0) {
    if (!canManage) {
      return <span className="text-muted-foreground text-sm">-</span>;
    }
  }

  if (!canManage) {
    return (
      <Badge
        data-slot="table-row-field-group-cell"
        data-test-id="field-group-cell"
        variant="secondary"
      >
        {total} {total === 1 && 'item'}
        {total !== 1 && 'itens'}
      </Badge>
    );
  }

  return (
    <>
      <div className="inline-flex items-center gap-1">
        <Badge
          data-slot="table-row-field-group-cell"
          data-test-id="field-group-cell"
          variant="secondary"
        >
          {total} {total === 1 && 'item'}
          {total !== 1 && 'itens'}
        </Badge>
      </div>
    </>
  );
}
