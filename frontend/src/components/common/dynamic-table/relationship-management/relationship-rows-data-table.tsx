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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useRelationshipLinkDelete } from '@/hooks/tanstack-query/use-relationship-link-delete';
import { useRelationshipLinksList } from '@/hooks/tanstack-query/use-relationship-links-list';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useFieldVisibility } from '@/hooks/use-field-visibility';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField, IRelationshipLink, IRow, ITable } from '@/lib/interfaces';

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

  return (
    <div
      data-slot="relationship-rows-data-table"
      className="space-y-2"
    >
      {canEdit && relatedTable.data && (
        <div className="flex items-center justify-end gap-2">
          <RelationshipSelectExistingSheet
            asChild
            field={field}
            relatedTable={relatedTable.data}
            parentTableSlug={parentTableSlug}
            relationshipId={relationshipId}
            side={side}
            recordId={recordId}
            onChanged={invalidate}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={singleLocked}
            >
              <span>Vincular existente</span>
            </Button>
          </RelationshipSelectExistingSheet>
          <RelationshipItemSheet
            asChild
            field={field}
            relatedTable={relatedTable.data}
            parentTableSlug={parentTableSlug}
            relationshipId={relationshipId}
            side={side}
            recordId={recordId}
            editRow={null}
            onChanged={invalidate}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={singleLocked}
            >
              <PlusIcon className="size-4" />
              <span>Criar novo</span>
            </Button>
          </RelationshipItemSheet>
        </div>
      )}

      {canEdit && !relatedTable.data && (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
          >
            <span>Vincular existente</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
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
                <RelationshipRow
                  key={linked.linkId}
                  linked={linked}
                  columnFields={columnFields}
                  canEdit={canEdit}
                  field={field}
                  relatedTable={relatedTable.data}
                  parentTableSlug={parentTableSlug}
                  relationshipId={relationshipId}
                  side={side}
                  recordId={recordId}
                  onChanged={invalidate}
                  onUnlink={(linkId): void => deleteLink.mutate({ linkId })}
                  unlinkPending={deleteLink.isPending}
                />
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
    </div>
  );
}

type RelationshipRowProps = {
  linked: LinkedRow;
  columnFields: Array<IField>;
  canEdit: boolean;
  field: IField;
  relatedTable?: ITable;
  parentTableSlug: string;
  relationshipId: string;
  side: 'source' | 'target';
  recordId: string;
  onChanged: () => void;
  onUnlink: (linkId: string) => void;
  unlinkPending: boolean;
};

function RelationshipRow({
  linked,
  columnFields,
  canEdit,
  field,
  relatedTable,
  parentTableSlug,
  relationshipId,
  side,
  recordId,
  onChanged,
  onUnlink,
  unlinkPending,
}: RelationshipRowProps): React.JSX.Element {
  const editTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const canEditRow = canEdit && Boolean(relatedTable) && Boolean(linked.row);

  return (
    <tr
      className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={(): void => {
        if (canEditRow) editTriggerRef.current?.click();
      }}
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
        onClick={(e: React.MouseEvent<HTMLTableCellElement>): void =>
          e.stopPropagation()
        }
      >
        <div className="flex items-center gap-1">
          {canEditRow && relatedTable && linked.row && (
            <RelationshipItemSheet
              ref={editTriggerRef}
              asChild
              field={field}
              relatedTable={relatedTable}
              parentTableSlug={parentTableSlug}
              relationshipId={relationshipId}
              side={side}
              recordId={recordId}
              editRow={linked.row}
              onChanged={onChanged}
            >
              <Button
                variant="ghost"
                size="icon-sm"
              >
                <PencilIcon className="size-3.5" />
              </Button>
            </RelationshipItemSheet>
          )}
          {canEdit && (
            <UnlinkConfirmDialog
              linkId={linked.linkId}
              pending={unlinkPending}
              onConfirm={onUnlink}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

function UnlinkConfirmDialog({
  linkId,
  pending,
  onConfirm,
}: {
  linkId: string;
  pending: boolean;
  onConfirm: (linkId: string) => void;
}): React.JSX.Element {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
        >
          <TrashIcon className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desvincular registro</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja desvincular este registro? Esta ação não
            exclui o registro, apenas remove o vínculo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              disabled={pending}
            >
              Cancelar
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={(): void => onConfirm(linkId)}
            >
              Desvincular
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
