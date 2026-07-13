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
import { TableRowUserGroupCell } from '@/components/common/dynamic-table/table-cells/table-row-user-group-cell';
import { Badge } from '@/components/ui/badge';
import { useFieldVisibility } from '@/hooks/use-field-visibility';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField, IGroupConfiguration, IRow } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';

const ROUTE_ID = '/_private/tables/$slug/';

function isRowRecord(value: unknown): value is IRow {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    '_id' in value
  );
}

// Resolve o primeiro sub-registro de um valor de FIELD_GROUP (`row[groupSlug]` é
// `Array<IRow>`). A listagem geral exibe apenas o primeiro sub-registro.
function resolveFirstSubRow(value: unknown): IRow | null {
  if (!Array.isArray(value)) return null;
  const [first] = value;
  if (isRowRecord(first)) return first;
  return null;
}

// Campo-filho de grupo elegível a aparecer como coluna na listagem geral.
function isEligibleGroupChildField(field: IField): boolean {
  return Boolean(
    field.showInParentList && field.visibleInParentList && !field.trashed,
  );
}

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
    case E_FIELD_TYPE.USER_GROUP:
      return (
        <TableRowUserGroupCell
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

// Um candidato a coluna: campo normal (parentGroup ausente) ou campo-filho de
// grupo elegível à listagem geral (parentGroup = o grupo dono).
type ColumnCandidate = {
  field: IField;
  parentGroup?: IGroupConfiguration;
};

type UseFieldColumnsOptions = {
  fields: Array<IField>;
  fieldOrder: Array<string>;
  tableSlug: string;
  canEditField: boolean;
  groups?: Array<IGroupConfiguration>;
};

export function useFieldColumns({
  fields,
  fieldOrder,
  tableSlug,
  canEditField,
  groups,
}: UseFieldColumnsOptions): Array<ColumnDef<IRow, unknown>> {
  const router = useRouter();
  const { slug } = useParams({ from: ROUTE_ID });
  const { isFieldVisible } = useFieldVisibility();

  return React.useMemo(() => {
    const candidates: Array<ColumnCandidate> = fields
      .filter((f) => isFieldVisible(f, 'list') && !f.trashed)
      .map((field) => ({ field }));

    for (const group of groups ?? []) {
      for (const childField of group.fields ?? []) {
        if (isEligibleGroupChildField(childField)) {
          candidates.push({ field: childField, parentGroup: group });
        }
      }
    }

    const sorted = candidates.sort((a, b) => {
      const idxA = fieldOrder.indexOf(a.field._id);
      const idxB = fieldOrder.indexOf(b.field._id);
      let rankA = idxA;
      if (idxA === -1) rankA = Infinity;
      let rankB = idxB;
      if (idxB === -1) rankB = Infinity;
      return rankA - rankB;
    });

    return sorted.map(
      ({ field, parentGroup }, index): ColumnDef<IRow, unknown> => {
        let accessorFn: (row: IRow) => unknown = (row): unknown =>
          row[field.slug];
        if (parentGroup) {
          accessorFn = (row): unknown => {
            const subRow = resolveFirstSubRow(row[parentGroup.slug]);
            if (!subRow) return undefined;
            return subRow[field.slug];
          };
        }

        return {
          id: field._id,
          accessorFn,
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
                let search: { group?: string } = {};
                if (parentGroup) search = { group: parentGroup.slug };
                router.navigate({
                  to: '/tables/$slug/field/$fieldId',
                  params: { fieldId: field._id, slug },
                  search,
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
          cell: ({ row }): React.JSX.Element => {
            let cell: React.JSX.Element = (
              <RenderCell
                field={field}
                row={row.original}
                tableSlug={tableSlug}
              />
            );
            if (parentGroup) {
              const subRow = resolveFirstSubRow(row.original[parentGroup.slug]);
              cell = <span className="text-muted-foreground text-sm">-</span>;
              if (subRow) {
                cell = (
                  <RenderCell
                    field={field}
                    row={subRow}
                    tableSlug={tableSlug}
                  />
                );
              }
            }
            return (
              <div className="flex items-center gap-2">
                {index === 0 && row.original.status === 'draft' && (
                  <Badge
                    variant="outline"
                    className="shrink-0 text-amber-600 border-amber-400"
                  >
                    Rascunho
                  </Badge>
                )}
                {cell}
              </div>
            );
          },
        };
      },
    );
  }, [
    fields,
    fieldOrder,
    tableSlug,
    canEditField,
    groups,
    router,
    slug,
    isFieldVisible,
  ]);
}
