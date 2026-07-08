import { useQuery } from '@tanstack/react-query';
import { PencilIcon, PlusIcon, Settings2Icon, TrashIcon } from 'lucide-react';
import React from 'react';

import { TableRowCategoryCell } from '../table-cells/table-row-category-cell';
import { TableRowDateCell } from '../table-cells/table-row-date-cell';
import { TableRowDropdownCell } from '../table-cells/table-row-dropdown-cell';
import { TableRowFileCell } from '../table-cells/table-row-file-cell';
import { TableRowRelationshipCell } from '../table-cells/table-row-relationship-cell';
import { TableRowTextLongCell } from '../table-cells/table-row-text-long-cell';
import { TableRowTextShortCell } from '../table-cells/table-row-text-short-cell';
import { TableRowUserCell } from '../table-cells/table-row-user-cell';

import { GroupFieldManagementSheet } from './group-field-management-sheet';
import { GroupRowDeleteDialog } from './group-row-delete-dialog';
import { GroupRowFormDialog } from './group-row-form-dialog';

import { Pagination } from '@/components/common/pagination';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { groupRowListPaginatedOptions } from '@/hooks/tanstack-query/_query-options';
import { useFieldVisibility } from '@/hooks/use-field-visibility';
import { E_FIELD_TYPE } from '@/lib/constant';
import type {
  IField,
  IGroupConfiguration,
  IRow,
  ITable,
} from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';

// Largura da coluna a partir de widthInList (px), seguindo a mesma semântica do
// `size` da lista normal. Sem valor → coluna dimensionada pelo conteúdo.
function columnWidth(field: IField): string | undefined {
  if (!field.widthInList) return undefined;
  return `${field.widthInList}px`;
}

type GroupRowsDataTableProps = {
  tableSlug: string;
  rowId: string;
  field: IField;
  table: ITable;
  canManage?: boolean;
};

export function GroupRowsDataTable({
  tableSlug,
  rowId,
  field,
  table,
  canManage = false,
}: GroupRowsDataTableProps): React.JSX.Element {
  const groupSlug = field.group?.slug;

  const group: IGroupConfiguration | undefined = table.groups?.find(
    (g) => g?.slug === groupSlug,
  );

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(6);

  const { isFieldVisible } = useFieldVisibility();

  const { data, status } = useQuery(
    groupRowListPaginatedOptions(tableSlug, rowId, groupSlug ?? '', {
      page,
      perPage,
    }),
  );

  const items = data?.data ?? [];
  const meta = data?.meta ?? {
    total: 0,
    page,
    perPage,
    lastPage: 1,
    firstPage: 0,
  };

  const formFields = React.useMemo(
    () =>
      (group?.fields ?? []).filter(
        (f): f is IField =>
          !!f &&
          f.type !== E_FIELD_TYPE.FIELD_GROUP &&
          f.type !== E_FIELD_TYPE.IDENTIFIER &&
          f.type !== E_FIELD_TYPE.STATUS &&
          f.type !== E_FIELD_TYPE.TRASHED_AT &&
          !f.trashed,
      ),
    [group],
  );

  const displayableFields = React.useMemo(
    () =>
      (group?.fields ?? []).filter(
        (f): f is IField =>
          !!f &&
          f.type !== E_FIELD_TYPE.FIELD_GROUP &&
          f.type !== E_FIELD_TYPE.STATUS &&
          f.type !== E_FIELD_TYPE.TRASHED_AT &&
          !f.trashed,
      ),
    [group],
  );

  const columnFields = React.useMemo(() => {
    const visible = displayableFields.filter((f) => isFieldVisible(f, 'list'));
    const hasAnyUserField = displayableFields.some((f) => !f.native);
    if (hasAnyUserField) return visible;
    return formFields;
  }, [displayableFields, formFields, isFieldVisible]);

  if (!groupSlug || !group) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner />
      </div>
    );
  }

  return (
    <div
      data-slot="group-rows-data-table"
      data-test-id="group-rows-table"
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium ml-2">
          {resolveFieldLabel(field)}
        </span>
        <div className="inline-flex items-center gap-2">
          {canManage && (
            <GroupFieldManagementSheet
              asChild
              table={table}
              groupSlug={groupSlug}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
              >
                <Settings2Icon className="size-4" />
                <span>Gerenciar campos</span>
              </Button>
            </GroupFieldManagementSheet>
          )}
          <GroupRowFormDialog
            asChild
            tableSlug={tableSlug}
            rowId={rowId}
            groupSlug={groupSlug}
            groupFields={formFields}
            editItem={null}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={field.multiple === false && meta.total >= 1}
            >
              <PlusIcon className="size-4" />
              <span>Adicionar item</span>
            </Button>
          </GroupRowFormDialog>
        </div>
      </div>

      <div className="w-full overflow-x-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {columnFields.map((gf) => (
                <th
                  key={gf._id}
                  className="px-4 py-2 text-left text-xs font-medium text-muted-foreground"
                  style={{ width: columnWidth(gf) }}
                >
                  {gf.name}
                </th>
              ))}
              <th className="w-20 px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={columnFields.length + 1}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Nenhum item encontrado
                </td>
              </tr>
            )}
            {items.map((item) => (
              <GroupRowItem
                key={item._id}
                item={item}
                columnFields={columnFields}
                formFields={formFields}
                tableSlug={tableSlug}
                rowId={rowId}
                groupSlug={groupSlug}
              />
            ))}
          </tbody>
        </table>
      </div>

      {field.multiple !== false && meta.total > 0 && (
        <Pagination
          meta={meta}
          page={page}
          perPage={perPage}
          onPageChange={(nextPage) => setPage(nextPage)}
          onPerPageChange={(nextPerPage) => {
            setPerPage(nextPerPage);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

type GroupRowItemProps = {
  item: IRow;
  columnFields: Array<IField>;
  formFields: Array<IField>;
  tableSlug: string;
  rowId: string;
  groupSlug: string;
};

function GroupRowItem({
  item,
  columnFields,
  formFields,
  tableSlug,
  rowId,
  groupSlug,
}: GroupRowItemProps): React.JSX.Element {
  const editTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  return (
    <tr
      className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => editTriggerRef.current?.click()}
    >
      {columnFields.map((gf) => (
        <td
          key={gf._id}
          className="px-4 py-2"
        >
          <RenderGroupCell
            field={gf}
            row={item}
          />
        </td>
      ))}
      <td
        className="w-20 px-4 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          <GroupRowFormDialog
            ref={editTriggerRef}
            asChild
            tableSlug={tableSlug}
            rowId={rowId}
            groupSlug={groupSlug}
            groupFields={formFields}
            editItem={item}
          >
            <Button
              variant="ghost"
              size="icon-sm"
            >
              <PencilIcon className="size-3.5" />
            </Button>
          </GroupRowFormDialog>
          <GroupRowDeleteDialog
            asChild
            tableSlug={tableSlug}
            rowId={rowId}
            groupSlug={groupSlug}
            itemId={item._id}
          >
            <Button
              variant="ghost"
              size="icon-sm"
            >
              <TrashIcon className="size-3.5" />
            </Button>
          </GroupRowDeleteDialog>
        </div>
      </td>
    </tr>
  );
}

function RenderGroupCell({
  field,
  row,
}: {
  field: IField;
  row: IRow;
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
    case E_FIELD_TYPE.USER:
    case E_FIELD_TYPE.CREATOR:
    case E_FIELD_TYPE.UPDATER:
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
    case E_FIELD_TYPE.CREATED_AT:
    case E_FIELD_TYPE.UPDATED_AT:
      return (
        <TableRowDateCell
          field={field}
          row={row}
        />
      );
    default:
      return <span className="text-muted-foreground text-sm">-</span>;
  }
}
