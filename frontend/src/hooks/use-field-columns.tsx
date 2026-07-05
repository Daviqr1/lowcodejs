import { useParams, useRouter } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import React from 'react';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { TableRowCategoryCell } from '@/components/common/dynamic-table/table-cells/table-row-category-cell';
import { TableRowDateCell } from '@/components/common/dynamic-table/table-cells/table-row-date-cell';
import { TableRowDropdownCell } from '@/components/common/dynamic-table/table-cells/table-row-dropdown-cell';
import { TableRowEvaluationCell } from '@/components/common/dynamic-table/table-cells/table-row-evaluation-cell';
import { TableRowFieldGroupCell } from '@/components/common/dynamic-table/table-cells/table-row-field-group-cell';
import { TableRowFileCell } from '@/components/common/dynamic-table/table-cells/table-row-file-cell';
import { TableRowReactionCell } from '@/components/common/dynamic-table/table-cells/table-row-reaction-cell';
import { TableRowRelationshipCell } from '@/components/common/dynamic-table/table-cells/table-row-relationship-cell';
import { TableRowTextLongCell } from '@/components/common/dynamic-table/table-cells/table-row-text-long-cell';
import { TableRowTextShortCell } from '@/components/common/dynamic-table/table-cells/table-row-text-short-cell';
import { TableRowUserCell } from '@/components/common/dynamic-table/table-cells/table-row-user-cell';
import { Badge } from '@/components/ui/badge';
import { useFieldVisibility } from '@/hooks/use-field-visibility';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField, IRow } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';

const ROUTE_ID = '/_private/tables/$slug/';

function RenderCell({
  field,
  row,
  tableSlug,
}: {
  field: IField;
  row: IRow;
  tableSlug: string;
}): React.JSX.Element {
  if (!field || !(field.slug in row)) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  switch (field.type) {
    case E_FIELD_TYPE.TEXT_SHORT:
      return (
        <TableRowTextShortCell
          field={field}
          row={row}
        />
      );
    case E_FIELD_TYPE.TEXT_LONG:
      return (
        <TableRowTextLongCell
          field={field}
          row={row}
          className="max-w-sm truncate"
        />
      );
    case E_FIELD_TYPE.DATE:
      return (
        <TableRowDateCell
          field={field}
          row={row}
        />
      );
    case E_FIELD_TYPE.DROPDOWN:
      return (
        <TableRowDropdownCell
          field={field}
          row={row}
        />
      );
    case E_FIELD_TYPE.CATEGORY:
      return (
        <TableRowCategoryCell
          field={field}
          row={row}
        />
      );
    case E_FIELD_TYPE.RELATIONSHIP:
      return (
        <TableRowRelationshipCell
          field={field}
          row={row}
        />
      );
    case E_FIELD_TYPE.FILE:
      return (
        <TableRowFileCell
          field={field}
          row={row}
        />
      );
    case E_FIELD_TYPE.FIELD_GROUP:
      return (
        <TableRowFieldGroupCell
          field={field}
          row={row}
          tableSlug={tableSlug}
        />
      );
    case E_FIELD_TYPE.REACTION:
      return (
        <TableRowReactionCell
          field={field}
          row={row}
          tableSlug={tableSlug}
        />
      );
    case E_FIELD_TYPE.EVALUATION:
      return (
        <TableRowEvaluationCell
          field={field}
          row={row}
          tableSlug={tableSlug}
        />
      );
    case E_FIELD_TYPE.USER:
      return (
        <TableRowUserCell
          field={field}
          row={row}
        />
      );
    case E_FIELD_TYPE.IDENTIFIER:
      return (
        <TableRowTextShortCell
          field={field}
          row={row}
        />
      );
    case E_FIELD_TYPE.UPDATER:
    case E_FIELD_TYPE.CREATOR:
      return (
        <TableRowUserCell
          field={field}
          row={row}
        />
      );
    case E_FIELD_TYPE.UPDATED_AT:
    case E_FIELD_TYPE.CREATED_AT:
    case E_FIELD_TYPE.TRASHED_AT:
      return (
        <TableRowDateCell
          field={field}
          row={row}
        />
      );
    case E_FIELD_TYPE.STATUS:
      return (
        <TableRowTextShortCell
          field={field}
          row={row}
        />
      );
    default:
      return <span className="text-muted-foreground text-sm">-</span>;
  }
}

type UseFieldColumnsOptions = {
  fields: Array<IField>;
  fieldOrder: Array<string>;
  tableSlug: string;
  canEditField: boolean;
};

export function useFieldColumns({
  fields,
  fieldOrder,
  tableSlug,
  canEditField,
}: UseFieldColumnsOptions): Array<ColumnDef<IRow, unknown>> {
  const router = useRouter();
  const { slug } = useParams({ from: ROUTE_ID });
  const { isFieldVisible } = useFieldVisibility();

  return React.useMemo(() => {
    const sorted = fields
      .filter((f) => isFieldVisible(f, 'list') && !f.trashed)
      .sort((a, b) => {
        const idxA = fieldOrder.indexOf(a._id);
        const idxB = fieldOrder.indexOf(b._id);
        let rankA = idxA;
        if (idxA === -1) rankA = Infinity;
        let rankB = idxB;
        if (idxB === -1) rankB = Infinity;
        return rankA - rankB;
      });

    return sorted.map(
      (field, index): ColumnDef<IRow, unknown> => ({
        id: field._id,
        accessorFn: (row) => row[field.slug],
        meta: { label: resolveFieldLabel(field), field },
        size: field.widthInList ?? undefined,
        header: (): React.JSX.Element => {
          let orderKey: string | undefined;
          if (field.type !== E_FIELD_TYPE.FIELD_GROUP) {
            orderKey = 'order-'.concat(field.slug);
          }
          let onTitleClick: (() => void) | undefined;
          if (canEditField) {
            onTitleClick = (): void => {
              router.navigate({
                to: '/tables/$slug/field/$fieldId',
                params: { fieldId: field._id, slug },
              });
            };
          }
          return (
            <DataTableColumnHeader
              title={resolveFieldLabel(field)}
              orderKey={orderKey}
              routeId={ROUTE_ID}
              canNavigate={canEditField}
              onTitleClick={onTitleClick}
            />
          );
        },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {index === 0 && row.original.status === 'draft' && (
              <Badge
                variant="outline"
                className="shrink-0 text-amber-600 border-amber-400"
              >
                Rascunho
              </Badge>
            )}
            <RenderCell
              field={field}
              row={row.original}
              tableSlug={tableSlug}
            />
          </div>
        ),
      }),
    );
  }, [
    fields,
    fieldOrder,
    tableSlug,
    canEditField,
    router,
    slug,
    isFieldVisible,
  ]);
}
