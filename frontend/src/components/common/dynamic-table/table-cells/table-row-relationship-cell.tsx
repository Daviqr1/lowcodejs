import { TableRowBadgeList } from './table-row-badge-list';

import { Badge } from '@/components/ui/badge';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import type { IField, IRow } from '@/lib/interfaces';
import { resolveRelationshipLabel } from '@/lib/relationship-label';
import { isManagedRelationship } from '@/lib/table';

interface RelationshipItem {
  _id: string;
  label: string;
  tableSlug: string | null;
}

interface TableRowRelationshipCellProps {
  row: IRow;
  field: IField;
}

// Modo 'manage' (tabelas internas): badge de contagem. Modo 'select' (padrão,
// multi-select): rótulos (chips) dos vinculados, via "Rótulo"/compositor.
export function TableRowRelationshipCell({
  field,
  row,
}: TableRowRelationshipCellProps): React.JSX.Element {
  const relConfig = field.relationship;
  const isManage = isManagedRelationship(field);
  const relatedTable = useReadTable({ slug: relConfig?.table?.slug ?? '' });

  const raw = row[field.slug];
  let total = 0;
  if (Array.isArray(raw)) total = raw.length;

  if (isManage) {
    return (
      <Badge
        data-slot="table-row-relationship-cell"
        data-test-id="relationship-cell"
        variant="secondary"
      >
        {total} {total === 1 && 'registro'}
        {total !== 1 && 'registros'}
      </Badge>
    );
  }

  const tableSlug = relConfig?.table?.slug ?? null;
  const relatedFields = relatedTable.data?.fields;
  const rawValues = Array.from(raw ?? []);

  const values = rawValues.map<RelationshipItem>((item) => {
    if (typeof item === 'object' && item !== null) {
      // valor dinamico de linha; resolveRelationshipLabel exige IRow (cast forcado).
      const obj = item as IRow;
      return {
        _id: String(obj._id ?? ''),
        label: resolveRelationshipLabel(obj, relConfig, relatedFields),
        tableSlug,
      };
    }
    return { _id: String(item), label: String(item), tableSlug };
  });

  return (
    <TableRowBadgeList
      data-slot="table-row-relationship-cell"
      data-test-id="relationship-cell"
      values={values}
      getKey={(item) => item._id}
      renderLabel={(item) => {
        if (item.tableSlug && item._id) {
          return (
            <a
              href={`/tables/${item.tableSlug}/row?_id=${item._id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {item.label}
            </a>
          );
        }
        return item.label;
      }}
    />
  );
}
