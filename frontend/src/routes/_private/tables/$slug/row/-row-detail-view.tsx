import { useMutation } from '@tanstack/react-query';
import {
  ArchiveRestoreIcon,
  PencilIcon,
  Trash2Icon,
  TrashIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { RelationshipRowsDataTable } from '@/components/common/dynamic-table/relationship-management/relationship-rows-data-table';
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
import { TableRowHtmlContentField } from '@/components/common/dynamic-table/table-row/table-row-html-content-field';
import { PermanentDeleteConfirmDialog } from '@/components/common/permanent-delete-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useFieldVisibility } from '@/hooks/use-field-visibility';
import { useTablePermission } from '@/hooks/use-table-permission';
import { API } from '@/lib/api';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField, IRow, ITable } from '@/lib/interfaces';
import { QueryClient } from '@/lib/query-client';
import { resolveFieldLabel } from '@/lib/table';

type RowDetailViewProps = {
  table: ITable;
  data: IRow;
  onBack: () => void;
  onEdit: () => void;
};

function renderCell(
  field: IField,
  row: IRow,
  tableSlug: string,
): React.JSX.Element {
  switch (field.type) {
    case E_FIELD_TYPE.TEXT_SHORT:
    case E_FIELD_TYPE.IDENTIFIER:
    case E_FIELD_TYPE.STATUS:
      return (
        <TableRowTextShortCell
          row={row}
          field={field}
        />
      );
    case E_FIELD_TYPE.TEXT_LONG:
      return (
        <TableRowTextLongCell
          row={row}
          field={field}
        />
      );
    case E_FIELD_TYPE.DATE:
    case E_FIELD_TYPE.CREATED_AT:
    case E_FIELD_TYPE.UPDATED_AT:
    case E_FIELD_TYPE.TRASHED_AT:
      return (
        <TableRowDateCell
          row={row}
          field={field}
        />
      );
    case E_FIELD_TYPE.DROPDOWN:
      return (
        <TableRowDropdownCell
          row={row}
          field={field}
        />
      );
    case E_FIELD_TYPE.FILE:
      return (
        <TableRowFileCell
          row={row}
          field={field}
        />
      );
    case E_FIELD_TYPE.RELATIONSHIP:
      return (
        <TableRowRelationshipCell
          row={row}
          field={field}
        />
      );
    case E_FIELD_TYPE.CATEGORY:
      return (
        <TableRowCategoryCell
          row={row}
          field={field}
        />
      );
    case E_FIELD_TYPE.EVALUATION:
      return (
        <TableRowEvaluationCell
          row={row}
          field={field}
          tableSlug={tableSlug}
        />
      );
    case E_FIELD_TYPE.REACTION:
      return (
        <TableRowReactionCell
          row={row}
          field={field}
          tableSlug={tableSlug}
        />
      );
    case E_FIELD_TYPE.USER:
    case E_FIELD_TYPE.CREATOR:
    case E_FIELD_TYPE.UPDATER:
      return (
        <TableRowUserCell
          row={row}
          field={field}
        />
      );
    case E_FIELD_TYPE.HTML_CONTENT:
      return <TableRowHtmlContentField field={field} />;
    default: {
      const rawValue: unknown = row[field.slug];
      return (
        <p className="text-sm text-muted-foreground">
          {String(rawValue ?? '-')}
        </p>
      );
    }
  }
}

export function RowDetailView({
  table,
  data,
  onBack,
  onEdit,
}: RowDetailViewProps): React.JSX.Element {
  const permission = useTablePermission(table);

  const trashTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const restoreTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const deleteTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  const slug = table.slug;
  const rowId = data._id;

  const trashMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await API.patch(`/tables/${slug}/rows/${rowId}/trash`);
    },
    onSuccess(): void {
      void QueryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(slug),
      });
      void QueryClient.invalidateQueries({
        queryKey: queryKeys.rows.detail(slug, rowId),
      });
      toast.success('Registro enviado para lixeira!');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await API.patch(`/tables/${slug}/rows/${rowId}/restore`);
    },
    onSuccess(): void {
      void QueryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(slug),
      });
      void QueryClient.invalidateQueries({
        queryKey: queryKeys.rows.detail(slug, rowId),
      });
      toast.success('Registro restaurado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await API.delete(`/tables/${slug}/rows/${rowId}`);
    },
    onSuccess(): void {
      void QueryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(slug),
      });
      toast.success('Registro excluído permanentemente!');
      onBack();
    },
  });

  const { isFieldVisible } = useFieldVisibility();

  const visibleFields = React.useMemo((): Array<IField> => {
    const detailOrder = table.fieldOrderDetail ?? [];
    let order = table.fieldOrderForm ?? [];
    if (detailOrder.length > 0) order = detailOrder;
    const filtered = table.fields.filter(
      (f) => !f.trashed && isFieldVisible(f, 'detail'),
    );
    if (order.length === 0) return filtered;
    return [...filtered].sort((a, b): number => {
      const idxA = order.indexOf(a._id);
      const idxB = order.indexOf(b._id);
      let sortA = idxA;
      if (idxA === -1) sortA = Infinity;
      let sortB = idxB;
      if (idxB === -1) sortB = Infinity;
      return sortA - sortB;
    });
  }, [
    table.fields,
    table.fieldOrderDetail,
    table.fieldOrderForm,
    isFieldVisible,
  ]);

  // Campos simples (sem grupo nem relacionamento) ficam no corpo; grupos e
  // relacionamentos vão para seções com tabs (§10.2).
  const mainFields = React.useMemo(
    (): Array<IField> =>
      visibleFields.filter(
        (f) =>
          f.type !== E_FIELD_TYPE.FIELD_GROUP &&
          f.type !== E_FIELD_TYPE.RELATIONSHIP,
      ),
    [visibleFields],
  );

  const groupFields = React.useMemo(
    (): Array<IField> =>
      visibleFields.filter((f) => f.type === E_FIELD_TYPE.FIELD_GROUP),
    [visibleFields],
  );

  // Todos os relacionamentos vão para as tabs de gestão (repetidor). N:N usa o
  // pivô; 1:1/1:N traduzem a FK em links sintéticos no backend (mesmo widget).
  const relationshipFields = React.useMemo(
    (): Array<IField> =>
      visibleFields.filter((f) => f.type === E_FIELD_TYPE.RELATIONSHIP),
    [visibleFields],
  );

  const canRemoveRow = permission.can('REMOVE_ROW');
  const canUpdateRow = permission.can('UPDATE_ROW');

  // Campo RELATIONSHIP é sempre materializado (pivô) após as migrations §11: usa a
  // tabela de gestão editável (vincular/desvincular/reordenar via /links). Zero
  // legado — não há mais fallback read-only embedded. Se faltar relationshipId
  // (não deveria), mostra empty-state pedindo a migration, nunca a célula legada.
  function renderRelationshipTab(field: IField): React.JSX.Element {
    const relConfig = field.relationship;
    if (!relConfig?.relationshipId || !relConfig?.side) {
      return (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Relacionamento ainda não materializado. Rode{' '}
          <code className="text-xs">npm run migrate:relationship</code> no
          backend.
        </div>
      );
    }
    return (
      <RelationshipRowsDataTable
        field={field}
        record={data}
        parentTableSlug={slug}
        canEdit={canUpdateRow && data.trashedAt == null}
      />
    );
  }

  return (
    <React.Fragment>
      <div className="shrink-0 px-2 pb-2 flex flex-row items-center justify-end gap-1">
        {data.status === 'draft' && (
          <Badge
            variant="outline"
            className="mr-auto text-amber-600 border-amber-400"
          >
            Rascunho
          </Badge>
        )}
        {data.trashedAt == null && canRemoveRow && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(): void => trashTriggerRef.current?.click()}
          >
            <TrashIcon className="size-4" />
            <span>Enviar para lixeira</span>
          </Button>
        )}

        {data.trashedAt != null && canRemoveRow && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(): void => restoreTriggerRef.current?.click()}
          >
            <ArchiveRestoreIcon className="size-4" />
            <span>Restaurar</span>
          </Button>
        )}

        {data.trashedAt != null && canRemoveRow && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={(): void => deleteTriggerRef.current?.click()}
          >
            <Trash2Icon className="size-4" />
            <span>Excluir permanentemente</span>
          </Button>
        )}

        {data.trashedAt == null && canUpdateRow && (
          <Button
            type="button"
            size="sm"
            data-test-id="row-edit-btn"
            onClick={onEdit}
          >
            <PencilIcon className="size-4" />
            <span>Editar</span>
          </Button>
        )}
      </div>

      <section
        className="flex-1 flex flex-col min-h-0 overflow-auto"
        data-test-id="row-detail-view"
      >
        <div className="space-y-4 p-4">
          {mainFields.map(
            (field): React.JSX.Element => (
              <div
                key={field._id}
                className="space-y-1"
              >
                <p className="text-sm font-medium">
                  {resolveFieldLabel(field, 'detail')}
                </p>
                {renderCell(field, data, slug)}
              </div>
            ),
          )}
        </div>

        {data.trashedAt != null && (
          <div className="rounded-md border border-amber-500 p-3 bg-amber-50 m-4">
            <p className="text-sm text-amber-700">
              Este registro está na lixeira
            </p>
          </div>
        )}

        {relationshipFields.length > 0 && (
          <div className="flex flex-col gap-2 pt-4 border-t p-4">
            <p className="text-sm font-semibold text-muted-foreground">
              Relacionamentos
            </p>
            <Tabs defaultValue={relationshipFields[0]._id}>
              <TabsList className="flex-wrap h-auto">
                {relationshipFields.map(
                  (field): React.JSX.Element => (
                    <TabsTrigger
                      key={field._id}
                      value={field._id}
                    >
                      {resolveFieldLabel(field, 'detail')}
                    </TabsTrigger>
                  ),
                )}
              </TabsList>
              {relationshipFields.map(
                (field): React.JSX.Element => (
                  <TabsContent
                    key={field._id}
                    value={field._id}
                    className="pt-2"
                  >
                    {renderRelationshipTab(field)}
                  </TabsContent>
                ),
              )}
            </Tabs>
          </div>
        )}

        {groupFields.length > 0 && (
          <div className="flex flex-col gap-2 pt-4 border-t p-4">
            <p className="text-sm font-semibold text-muted-foreground">
              Grupos
            </p>
            <Tabs defaultValue={groupFields[0]._id}>
              <TabsList className="flex-wrap h-auto">
                {groupFields.map(
                  (field): React.JSX.Element => (
                    <TabsTrigger
                      key={field._id}
                      value={field._id}
                    >
                      {resolveFieldLabel(field, 'detail')}
                    </TabsTrigger>
                  ),
                )}
              </TabsList>
              {groupFields.map(
                (field): React.JSX.Element => (
                  <TabsContent
                    key={field._id}
                    value={field._id}
                    className="pt-2"
                  >
                    <TableRowFieldGroupCell
                      row={data}
                      field={field}
                      tableSlug={slug}
                      table={table}
                      variant="detail"
                    />
                  </TabsContent>
                ),
              )}
            </Tabs>
          </div>
        )}
      </section>

      <div className="shrink-0 border-t bg-sidebar p-2">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2 cursor-pointer max-w-40 w-full"
            onClick={onBack}
          >
            <span>Voltar</span>
          </Button>
        </div>
      </div>

      <ConfirmDialog
        ref={trashTriggerRef}
        title="Enviar para lixeira"
        description="Ao confirmar, o registro será enviado para a lixeira."
        confirmLabel="Confirmar"
        isPending={trashMutation.status === 'pending'}
        onConfirm={(close): void => {
          trashMutation.mutateAsync(undefined, { onSuccess: close });
        }}
      />

      <ConfirmDialog
        ref={restoreTriggerRef}
        title="Restaurar da lixeira"
        description="Ao confirmar, o registro será restaurado da lixeira."
        confirmLabel="Confirmar"
        isPending={restoreMutation.status === 'pending'}
        onConfirm={(close): void => {
          restoreMutation.mutateAsync(undefined, { onSuccess: close });
        }}
      />

      <PermanentDeleteConfirmDialog
        ref={deleteTriggerRef}
        title="Excluir registro permanentemente"
        description="Essa ação é irreversível. O registro será excluído permanentemente."
        itemsCount={1}
        isPending={deleteMutation.isPending}
        onConfirm={(close): void => {
          deleteMutation.mutateAsync(undefined, { onSuccess: close });
        }}
        testId="delete-row-dialog"
      />
    </React.Fragment>
  );
}
