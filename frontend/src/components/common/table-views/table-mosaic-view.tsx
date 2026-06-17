import { useParams, useRouter } from '@tanstack/react-router';
import React from 'react';

import { TableRowActionsMenu } from './table-row-actions-menu';
import { RowSelectCheckbox } from './use-row-selection';

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
import { FieldTitle } from '@/components/common/field-title';
import { Badge } from '@/components/ui/badge';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useTablePermission } from '@/hooks/use-table-permission';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField, ILayoutFields, IRow } from '@/lib/interfaces';
import { resolveLayoutField } from '@/lib/layout-field-resolver';
import { HeaderFilter, HeaderSorter } from '@/lib/layout-pickers';

interface Props {
  data: Array<IRow>;
  headers: Array<IField>;
  order: Array<string>;
  layoutFields?: ILayoutFields | null;
}

interface RenderMosaicCellProps {
  field: IField;
  row: IRow;
  tableSlug: string;
}

function RenderMosaicCell({
  field,
  row,
  tableSlug,
}: RenderMosaicCellProps): React.JSX.Element {
  if (!(field.slug in row)) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">
          <FieldTitle value={field.name} />
        </span>
        <span className="text-muted-foreground text-sm">-</span>
      </div>
    );
  }

  const renderContent = (): React.JSX.Element => {
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
            isCardOrMosaic
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
      case E_FIELD_TYPE.CREATOR:
        return (
          <TableRowUserCell
            field={field}
            row={row}
          />
        );
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
  };

  return <div className="flex flex-col gap-0.5">{renderContent()}</div>;
}

export function TableMosaicView({
  data,
  headers,
  order,
  layoutFields,
}: Props): React.JSX.Element {
  const router = useRouter();
  const { slug } = useParams({ from: '/_private/tables/$slug/' });
  const table = useReadTable({ slug });
  const permission = useTablePermission(table.data);
  const canSelect = permission.can('UPDATE_ROW');

  const visibleHeaders = headers.filter(HeaderFilter).sort(HeaderSorter(order));

  const thumbField = resolveLayoutField(
    visibleHeaders,
    layoutFields,
    'cover',
    E_FIELD_TYPE.FILE,
  );
  const titleField = resolveLayoutField(
    visibleHeaders,
    layoutFields,
    'title',
    E_FIELD_TYPE.TEXT_SHORT,
  );
  const descField = resolveLayoutField(
    visibleHeaders,
    layoutFields,
    'description',
    E_FIELD_TYPE.TEXT_LONG,
  );

  return (
    <div
      className="gap-x-4 columns-1 sm:columns-2 lg:columns-3 xl:columns-4"
      data-test-id="table-mosaic-view"
    >
      {data.map((row) => (
        <article
          key={row._id}
          className="mb-4 break-inside-avoid rounded-2xl border border-border/60 bg-background shadow-sm overflow-hidden cursor-pointer hover:bg-muted/20"
          onClick={() => {
            router.navigate({
              to: '/tables/$slug/row/',
              params: { slug },
              search: { _id: row._id },
            });
          }}
        >
          <div className="w-full bg-muted">
            {thumbField ? (
              <RenderMosaicCell
                field={thumbField}
                row={row}
                tableSlug={slug}
              />
            ) : (
              <div className="w-full aspect-4/3 flex items-center justify-center text-xs text-muted-foreground">
                sem imagem
              </div>
            )}
          </div>

          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                {row.status === 'draft' && (
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-400"
                  >
                    Rascunho
                  </Badge>
                )}
                <div className="font-semibold leading-tight line-clamp-2">
                  {titleField ? (
                    <RenderMosaicCell
                      field={titleField}
                      row={row}
                      tableSlug={slug}
                    />
                  ) : (
                    <span className="text-muted-foreground">Sem título</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canSelect && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center"
                  >
                    <RowSelectCheckbox id={row._id} />
                  </div>
                )}
                <TableRowActionsMenu
                  slug={slug}
                  row={row}
                  table={table.data}
                />
              </div>
            </div>

            {descField ? (
              <div className="mt-1 text-sm text-muted-foreground line-clamp-3">
                <RenderMosaicCell
                  field={descField}
                  row={row}
                  tableSlug={slug}
                />
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
