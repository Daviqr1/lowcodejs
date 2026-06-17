import { useParams, useRouter } from '@tanstack/react-router';
import { ArrowRightIcon, PlusIcon } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useTablePermission } from '@/hooks/use-table-permission';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField, ILayoutFields, IRow } from '@/lib/interfaces';
import { resolveLayoutField } from '@/lib/layout-field-resolver';
import { HeaderFilter, HeaderSorter } from '@/lib/layout-pickers';

interface TableGridViewProps {
  data: Array<IRow>;
  headers: Array<IField>;
  order: Array<string>;
  layoutFields?: ILayoutFields | null;
}

interface RenderGridCellProps {
  field: IField;
  row: IRow;
  tableSlug: string;
  isThumb?: boolean;
}

function RenderGridCell({
  field,
  row,
  tableSlug,
  isThumb = false,
}: RenderGridCellProps): React.JSX.Element {
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
            isGallery={!isThumb}
            isCardOrMosaic={isThumb}
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
      default:
        return <span className="text-muted-foreground text-sm">-</span>;
    }
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">
        <FieldTitle value={field.name} />
      </span>
      {renderContent()}
    </div>
  );
}

export function TableGridView({
  data,
  headers,
  order,
  layoutFields,
}: TableGridViewProps): React.ReactElement {
  const router = useRouter();

  const { slug } = useParams({
    from: '/_private/tables/$slug/',
  });

  const table = useReadTable({ slug });
  const permission = useTablePermission(table.data);

  const canCreateRow = permission.can('CREATE_ROW');
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
      className="p-4"
      data-test-id="table-grid-view"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.map((row) => (
          <Card
            key={row._id}
            className="overflow-hidden p-0"
          >
            <div className="w-full bg-muted aspect-4/3 overflow-hidden">
              {thumbField ? (
                <RenderGridCell
                  field={thumbField}
                  row={row}
                  tableSlug={slug}
                  isThumb
                />
              ) : (
                <div className="w-full aspect-4/3 flex items-center justify-center text-xs text-muted-foreground">
                  sem imagem
                </div>
              )}
            </div>
            <CardContent className="p-3 space-y-1">
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
                  <RenderGridCell
                    field={titleField}
                    row={row}
                    tableSlug={slug}
                  />
                ) : (
                  <span className="text-muted-foreground">Sem título</span>
                )}
              </div>
              {descField ? (
                <div className="text-sm text-muted-foreground line-clamp-2">
                  <RenderGridCell
                    field={descField}
                    row={row}
                    tableSlug={slug}
                  />
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="inline-flex justify-between items-center p-1">
              <div className="flex items-center gap-1">
                {canSelect && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center pl-1"
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
              <Button
                variant="ghost"
                className="p-0"
                onClick={() => {
                  router.navigate({
                    to: '/tables/$slug/row/',
                    params: { slug },
                    search: { _id: row._id },
                  });
                }}
              >
                <span>Ver detalhes</span>
                <ArrowRightIcon />
              </Button>
            </CardFooter>
          </Card>
        ))}

        {canCreateRow &&
          (table.data?.fields?.filter((f) => !f.native)?.length ?? 0) > 0 && (
            <Card className="overflow-hidden border-dashed flex items-center justify-center min-h-32">
              <Button
                variant="ghost"
                className="flex flex-col gap-2 h-full w-full"
                onClick={() => {
                  router.navigate({
                    to: '/tables/$slug/row',
                    replace: true,
                    params: { slug },
                  });
                }}
              >
                <PlusIcon className="size-8 text-muted-foreground" />
                <span className="text-muted-foreground">Registro</span>
              </Button>
            </Card>
          )}
      </div>
    </div>
  );
}
