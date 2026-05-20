import { useRouter, useSearch } from '@tanstack/react-router';
import { ArchiveRestoreIcon, PencilIcon, TrashIcon } from 'lucide-react';
import React from 'react';

import { RowFormFields } from '../create/-create-form';

import { RowDeleteDialog } from './-delete-dialog';
import { RowRemoveFromTrashDialog } from './-remove-from-trash-dialog';
import { RowSendToTrashDialog } from './-send-to-trash-dialog';
import { RowView } from './-view';

import {
  UploadingProvider,
  useIsUploading,
} from '@/components/common/file-upload/uploading-context';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { useExtensionsBoundToTable } from '@/hooks/tanstack-query/use-extensions-bound-to-table';
import { useUpdateTableRow } from '@/hooks/tanstack-query/use-table-row-update';
import { useTablePermission } from '@/hooks/use-table-permission';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { E_ROLE } from '@/lib/constant';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';
import type { IField, IRow, ITable } from '@/lib/interfaces';
import { buildRowPayload, buildUpdateRowDefaultValues } from '@/lib/table';
import { toastSuccess } from '@/lib/toast';
import { useAuthStore } from '@/stores/authentication';

interface UpdateRowFormProps {
  table: ITable;
  data: IRow;
}

export function UpdateRowForm(props: UpdateRowFormProps): React.JSX.Element {
  return (
    <UploadingProvider>
      <UpdateRowFormContent {...props} />
    </UploadingProvider>
  );
}

function UpdateRowFormContent({
  table,
  data,
}: UpdateRowFormProps): React.JSX.Element {
  const sidebar = useSidebar();
  const isUploading = useIsUploading();
  const router = useRouter();
  const permission = useTablePermission(table);
  const search = useSearch({ from: '/_private/tables/$slug/row/$rowId/' });

  const user = useAuthStore((s) => s.user);
  const { data: boundPlugins = [] } = useExtensionsBoundToTable(table._id);
  const isAdmin =
    user?.group?.slug === E_ROLE.MASTER ||
    user?.group?.slug === E_ROLE.ADMINISTRATOR;
  const visibilityPluginActive = boundPlugins.some(
    (e) => `${e.pkg}:${e.extensionId}` === 'core:visibility-by-role',
  );
  const disabledFields = React.useMemo(() => {
    const set = new Set<string>();
    if (visibilityPluginActive && !isAdmin) set.add('visibility');
    return set;
  }, [visibilityPluginActive, isAdmin]);

  const canEditRow = permission.can('UPDATE_ROW');
  const initialMode: 'show' | 'edit' =
    search.mode === 'edit' && canEditRow && !data.trashed ? 'edit' : 'show';
  const [mode, setMode] = React.useState<'show' | 'edit'>(initialMode);

  const slug = table.slug;
  const rowId = data._id;

  const goBack = (): void => {
    sidebar.setOpen(false);
    router.navigate({
      to: '/tables/$slug',
      replace: true,
      params: { slug },
    });
  };

  const baseFields = React.useMemo(
    () => table.fields.filter((f) => !f.trashed),
    [table.fields],
  );

  const sortByOrder =
    (order: Array<string>) =>
    (a: IField, b: IField): number => {
      const idxA = order.indexOf(a._id);
      const idxB = order.indexOf(b._id);
      return (idxA === -1 ? Infinity : idxA) - (idxB === -1 ? Infinity : idxB);
    };

  const formFields = React.useMemo(
    () => [...baseFields].sort(sortByOrder(table.fieldOrderForm ?? [])),
    [baseFields, table.fieldOrderForm],
  );

  const viewFields = React.useMemo(() => {
    const detailOrder = table.fieldOrderDetail ?? [];
    const order =
      detailOrder.length > 0 ? detailOrder : (table.fieldOrderForm ?? []);
    return [...baseFields].sort(sortByOrder(order));
  }, [baseFields, table.fieldOrderDetail, table.fieldOrderForm]);

  const form = useAppForm({
    defaultValues: buildUpdateRowDefaultValues(data, formFields),
    onSubmit: async ({ value }) => {
      if (_update.status === 'pending') return;

      const payload = buildRowPayload(value, formFields);

      await _update.mutateAsync({
        slug,
        rowId,
        data: payload,
      });
    },
  });

  useApiErrorAutoClear(form);

  const _update = useUpdateTableRow({
    onSuccess() {
      toastSuccess(
        'Registro atualizado',
        'O registro foi atualizado com sucesso',
      );

      form.reset();
      setMode('show');
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao atualizar o registro',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
      });
    },
  });

  const isDisabled = mode === 'show' || _update.status === 'pending';

  return (
    <React.Fragment>
      <div className="shrink-0 px-2 pb-2 flex flex-row justify-end gap-1">
        {mode === 'show' && !data.trashed && permission.can('REMOVE_ROW') && (
          <RowSendToTrashDialog
            rowId={rowId}
            slug={slug}
            asChild
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
            >
              <TrashIcon className="size-4" />
              <span>Enviar para lixeira</span>
            </Button>
          </RowSendToTrashDialog>
        )}

        {mode === 'show' && data.trashed && permission.can('REMOVE_ROW') && (
          <RowRemoveFromTrashDialog
            rowId={rowId}
            slug={slug}
            asChild
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
            >
              <ArchiveRestoreIcon className="size-4" />
              <span>Restaurar</span>
            </Button>
          </RowRemoveFromTrashDialog>
        )}

        {mode === 'show' && data.trashed && permission.can('REMOVE_ROW') && (
          <RowDeleteDialog
            rowId={rowId}
            slug={slug}
            asChild
          >
            <Button
              type="button"
              variant="destructive"
              size="sm"
            >
              <TrashIcon className="size-4" />
              <span>Excluir permanentemente</span>
            </Button>
          </RowDeleteDialog>
        )}

        {mode === 'show' && !data.trashed && permission.can('UPDATE_ROW') && (
          <Button
            type="button"
            className="px-2 cursor-pointer max-w-40 w-full"
            size="sm"
            data-test-id="row-edit-btn"
            onClick={() => setMode('edit')}
          >
            <PencilIcon className="size-4 mr-1" />
            <span>Editar</span>
          </Button>
        )}
      </div>

      {mode === 'show' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-auto">
          <RowView
            data={data}
            fields={viewFields}
            tableSlug={slug}
            table={table}
          />
        </div>
      )}

      {/* Footer - Show Mode */}
      {mode === 'show' && (
        <div className="shrink-0 border-t bg-sidebar p-2">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-2 cursor-pointer max-w-40 w-full"
              onClick={goBack}
            >
              <span>Voltar</span>
            </Button>
          </div>
        </div>
      )}

      {mode === 'edit' && (
        <form
          className="flex-1 flex flex-col min-h-0 overflow-auto"
          data-test-id="update-row-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <RowFormFields
            form={form}
            fields={formFields}
            disabled={isDisabled}
            tableSlug={slug}
            disabledFields={disabledFields}
          />
        </form>
      )}

      {/* Footer - Edit Mode */}
      {mode === 'edit' && (
        <div className="shrink-0 border-t bg-sidebar p-2">
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="disabled:cursor-not-allowed px-2 cursor-pointer max-w-40 w-full"
                  data-test-id="update-row-cancel-btn"
                  disabled={isSubmitting}
                  onClick={() => {
                    form.reset();
                    setMode('show');
                  }}
                >
                  <span>Cancelar</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="disabled:cursor-not-allowed px-2 cursor-pointer max-w-40 w-full"
                  data-test-id="update-row-submit-btn"
                  disabled={!canSubmit || isUploading}
                  onClick={() => form.handleSubmit()}
                >
                  {isSubmitting && <Spinner />}
                  <span>Salvar</span>
                </Button>
              </div>
            )}
          />
        </div>
      )}
    </React.Fragment>
  );
}
