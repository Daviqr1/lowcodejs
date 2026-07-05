import { useQueryClient } from '@tanstack/react-query';
import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { TableRowCategoryCell } from '../table-cells/table-row-category-cell';
import { TableRowDateCell } from '../table-cells/table-row-date-cell';
import { TableRowDropdownCell } from '../table-cells/table-row-dropdown-cell';
import { TableRowFileCell } from '../table-cells/table-row-file-cell';
import { TableRowRelationshipCell } from '../table-cells/table-row-relationship-cell';
import { TableRowTextLongCell } from '../table-cells/table-row-text-long-cell';
import { TableRowTextShortCell } from '../table-cells/table-row-text-short-cell';
import { TableRowUserCell } from '../table-cells/table-row-user-cell';

import { RelationshipItemSheet } from './relationship-item-sheet';
import { otherIdOf } from './relationship-rows-inline';
import { RelationshipSelectExistingSheet } from './relationship-select-existing-sheet';

import { Pagination } from '@/components/common/pagination';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useRelationshipLinkDelete } from '@/hooks/tanstack-query/use-relationship-link-delete';
import { useRelationshipLinksList } from '@/hooks/tanstack-query/use-relationship-links-list';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useFieldVisibility } from '@/hooks/use-field-visibility';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField, IRelationshipLink, IRow } from '@/lib/interfaces';

function columnWidth(field: IField): string | undefined {
  if (!field.widthInList) return undefined;
  return `${field.widthInList}px`;
}

type RelationshipRowsDataTableProps = {
  field: IField;
  record: IRow;
  parentTableSlug: string;
  canEdit: boolean;
};

type LinkedRow = {
  linkId: string;
  otherId: string;
  row: IRow | null;
};

export function RelationshipRowsDataTable({
  field,
  record,
  parentTableSlug,
  canEdit,
}: RelationshipRowsDataTableProps): React.JSX.Element {
  const relConfig = field.relationship;
  const relationshipId = relConfig?.relationshipId ?? '';
  const side: 'source' | 'target' = relConfig?.side ?? 'source';
  const otherTableSlug = relConfig?.table?.slug ?? '';
  const isMultiple = Boolean(field.multiple);
  const recordId = String(record._id ?? '');

  const queryClient = useQueryClient();
  const { isFieldVisible } = useFieldVisibility();
  const [page, setPage] = React.useState<number>(1);
  const [perPage, setPerPage] = React.useState<number>(10);
  const [sheetOpen, setSheetOpen] = React.useState<boolean>(false);
  const [editRow, setEditRow] = React.useState<IRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(
    null,
  );
  const [selectSheetOpen, setSelectSheetOpen] = React.useState<boolean>(false);

  const relatedTable = useReadTable({ slug: otherTableSlug });

  const linksQuery = useRelationshipLinksList({
    tableSlug: parentTableSlug,
    relationshipId,
    side,
    recordId,
    page,
    perPage,
  });

  const links = React.useMemo(
    (): Array<IRelationshipLink> => linksQuery.data?.data ?? [],
    [linksQuery.data?.data],
  );
  const meta = linksQuery.data?.meta ?? {
    total: 0,
    page,
    perPage,
    lastPage: 1,
    firstPage: 0,
  };

  // Mapa _id do outro lado -> registro completo, a partir da projeção
  // read-compat em record[field.slug] (já hidratada/populada no GET do registro).
  const rowMap = React.useMemo((): Map<string, IRow> => {
    const map = new Map<string, IRow>();
    const projected = record[field.slug];
    const isRow = (value: unknown): value is IRow =>
      typeof value === 'object' && value !== null && '_id' in value;
    if (Array.isArray(projected)) {
      for (const item of projected) {
        if (!isRow(item)) continue;
        const id = String(item._id ?? '');
        if (id) map.set(id, item);
      }
    }
    return map;
  }, [record, field.slug]);

  const linkedRows = React.useMemo((): Array<LinkedRow> => {
    return links.map((link): LinkedRow => {
      const otherId = otherIdOf(link, side);
      return { linkId: link._id, otherId, row: rowMap.get(otherId) ?? null };
    });
  }, [links, side, rowMap]);

  const columnFields = React.useMemo((): Array<IField> => {
    const fields = relatedTable.data?.fields ?? [];
    return fields.filter(
      (f: IField): f is IField =>
        !f.trashed &&
        !f.native &&
        f.type !== E_FIELD_TYPE.FIELD_GROUP &&
        f.type !== E_FIELD_TYPE.RELATIONSHIP &&
        f.type !== E_FIELD_TYPE.STATUS &&
        f.type !== E_FIELD_TYPE.TRASHED_AT &&
        isFieldVisible(f, 'list'),
    );
  }, [relatedTable.data?.fields, isFieldVisible]);

  const invalidate = React.useCallback((): void => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.rows.all(parentTableSlug),
    });
  }, [queryClient, parentTableSlug]);

  const deleteLink = useRelationshipLinkDelete({
    tableSlug: parentTableSlug,
    relationshipId,
    side,
    recordId,
    onSuccess(): void {
      invalidate();
    },
    onError(): void {
      toast.error('Não foi possível desvincular o registro');
    },
  });

  if (!relationshipId) {
    return (
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        Relacionamento ainda não materializado.
      </p>
    );
  }

  const singleLocked = !isMultiple && meta.total >= 1;

  function openCreate(): void {
    setEditRow(null);
    setSheetOpen(true);
  }

  function openEdit(row: IRow | null): void {
    if (!row) return;
    setEditRow(row);
    setSheetOpen(true);
  }

  return (
    <div
      data-slot="relationship-rows-data-table"
      className="space-y-2"
    >
      {canEdit && (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(): void => setSelectSheetOpen(true)}
            disabled={singleLocked || !relatedTable.data}
          >
            <span>Vincular existente</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCreate}
            disabled={singleLocked || !relatedTable.data}
          >
            <PlusIcon className="size-4" />
            <span>Criar novo</span>
          </Button>
        </div>
      )}

      {linksQuery.isLoading && (
        <div className="flex items-center justify-center py-4">
          <Spinner className="opacity-50" />
        </div>
      )}

      {!linksQuery.isLoading && (
        <div className="w-full overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {columnFields.map((cf) => (
                  <th
                    key={cf._id}
                    className="px-4 py-2 text-left text-xs font-medium text-muted-foreground"
                    style={{ width: columnWidth(cf) }}
                  >
                    {cf.name}
                  </th>
                ))}
                <th className="w-20 px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {linkedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={columnFields.length + 1}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Nenhum item vinculado
                  </td>
                </tr>
              )}
              {linkedRows.map((linked) => (
                <tr
                  key={linked.linkId}
                  className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(): void => openEdit(linked.row)}
                >
                  {columnFields.map((cf) => (
                    <td
                      key={cf._id}
                      className="px-4 py-2"
                    >
                      <RenderRelationshipCell
                        field={cf}
                        row={linked.row}
                      />
                    </td>
                  ))}
                  <td
                    className="w-20 px-4 py-2"
                    onClick={(
                      e: React.MouseEvent<HTMLTableCellElement>,
                    ): void => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(
                            e: React.MouseEvent<HTMLButtonElement>,
                          ): void => {
                            e.stopPropagation();
                            openEdit(linked.row);
                          }}
                        >
                          <PencilIcon className="size-3.5" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={deleteLink.isPending}
                          onClick={(
                            e: React.MouseEvent<HTMLButtonElement>,
                          ): void => {
                            e.stopPropagation();
                            setConfirmDeleteId(linked.linkId);
                          }}
                        >
                          <TrashIcon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.total > 0 && (
        <Pagination
          meta={meta}
          page={page}
          perPage={perPage}
          onPageChange={(nextPage: number): void => setPage(nextPage)}
          onPerPageChange={(nextPerPage: number): void => {
            setPerPage(nextPerPage);
            setPage(1);
          }}
        />
      )}

      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(open: boolean): void => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desvincular registro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desvincular este registro? Esta ação não
              exclui o registro, apenas remove o vínculo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={(): void => setConfirmDeleteId(null)}
              disabled={deleteLink.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteLink.isPending}
              onClick={(): void => {
                if (confirmDeleteId !== null) {
                  deleteLink.mutate({ linkId: confirmDeleteId });
                  setConfirmDeleteId(null);
                }
              }}
            >
              Desvincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {relatedTable.data && (
        <RelationshipSelectExistingSheet
          open={selectSheetOpen}
          onOpenChange={setSelectSheetOpen}
          field={field}
          relatedTable={relatedTable.data}
          parentTableSlug={parentTableSlug}
          relationshipId={relationshipId}
          side={side}
          recordId={recordId}
          onChanged={invalidate}
        />
      )}

      {relatedTable.data && (
        <RelationshipItemSheet
          open={sheetOpen}
          onOpenChange={(open: boolean): void => {
            setSheetOpen(open);
            if (!open) setEditRow(null);
          }}
          field={field}
          relatedTable={relatedTable.data}
          parentTableSlug={parentTableSlug}
          relationshipId={relationshipId}
          side={side}
          recordId={recordId}
          editRow={editRow}
          onChanged={invalidate}
        />
      )}
    </div>
  );
}

export function RenderRelationshipCell({
  field,
  row,
}: {
  field: IField;
  row: IRow | null;
}): React.JSX.Element {
  if (!row || !(field.slug in row)) {
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
      return (
        <TableRowUserCell
          field={field}
          row={row}
        />
      );
    default:
      return <span className="text-muted-foreground text-sm">-</span>;
  }
}
