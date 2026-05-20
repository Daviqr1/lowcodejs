import { useNavigate, useSearch } from '@tanstack/react-router';
import React from 'react';

import { RowFormFields } from './-create-form';

import {
  UploadingProvider,
  useIsUploading,
} from '@/components/common/file-upload/uploading-context';
import { AccessDenied } from '@/components/common/route-status/access-denied';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { useExtensionsBoundToTable } from '@/hooks/tanstack-query/use-extensions-bound-to-table';
import { useCreateTableRow } from '@/hooks/tanstack-query/use-table-row-create';
import { useTablePermission } from '@/hooks/use-table-permission';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { E_FIELD_TYPE, E_ROLE } from '@/lib/constant';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';
import type { ITable } from '@/lib/interfaces';
import { buildCreateRowDefaultValues, buildRowPayload } from '@/lib/table';
import { toastSuccess } from '@/lib/toast';
import { useAuthStore } from '@/stores/authentication';

interface CreateRowFormProps {
  table: ITable;
}

export function CreateRowForm(props: CreateRowFormProps): React.JSX.Element {
  return (
    <UploadingProvider>
      <CreateRowFormContent {...props} />
    </UploadingProvider>
  );
}

function CreateRowFormContent({
  table,
}: CreateRowFormProps): React.JSX.Element {
  const permissions = useTablePermission(table);
  const isUploading = useIsUploading();

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

  const { categoryId, categorySlug } = useSearch({
    from: '/_private/tables/$slug/row/create/',
  });

  const sidebar = useSidebar();
  const navigate = useNavigate();

  const fields = React.useMemo(() => {
    const order = table.fieldOrderForm;
    return table.fields
      .filter((f) => !f.trashed && f.showInForm)
      .sort((a, b) => {
        const idxA = order.indexOf(a._id);
        const idxB = order.indexOf(b._id);
        return (
          (idxA === -1 ? Infinity : idxA) - (idxB === -1 ? Infinity : idxB)
        );
      });
  }, [table.fields, table.fieldOrderForm]);

  const form = useAppForm({
    defaultValues: buildCreateRowDefaultValues(fields),
    onSubmit: async ({ value }) => {
      if (_create.status === 'pending') return;
      const _data = buildRowPayload(value, fields);
      await _create.mutateAsync({ slug: table.slug, data: _data });
    },
  });

  useApiErrorAutoClear(form);

  const _create = useCreateTableRow({
    onSuccess(data) {
      toastSuccess('Registro criado', 'O registro foi criado com sucesso');

      form.reset();

      const hasGroups = table.fields.some(
        (f) => f.type === E_FIELD_TYPE.FIELD_GROUP && !f.trashed,
      );

      if (hasGroups) {
        navigate({
          to: '/tables/$slug/row/$rowId',
          params: { slug: table.slug, rowId: data._id },
        });
      } else {
        sidebar.setOpen(false);

        navigate({
          to: '/tables/$slug',
          replace: true,
          params: { slug: table.slug },
        });
      }
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao criar o registro',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
      });
    },
  });

  const [prefillApplied, setPrefillApplied] = React.useState(false);

  React.useEffect(() => {
    if (!categoryId || !categorySlug) return;
    if (prefillApplied) return;

    const targetField = fields.find(
      (field) =>
        field.slug === categorySlug && field.type === E_FIELD_TYPE.CATEGORY,
    );

    if (!targetField) return;

    // CATEGORY form value is always an array (single or multiple),
    // and payload normalization handles limiting when multiple=false.
    form.setFieldValue(categorySlug, [categoryId]);
    setPrefillApplied(true);
  }, [fields, categoryId, categorySlug, form, prefillApplied]);

  if (!permissions.can('CREATE_ROW')) return <AccessDenied />;

  return (
    <React.Fragment>
      <form
        className="flex-1 flex flex-col min-h-0 overflow-auto relative"
        data-test-id="create-row-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <RowFormFields
          form={form}
          fields={fields}
          disabled={_create.status === 'pending'}
          tableSlug={table.slug}
          disabledFields={disabledFields}
        />
      </form>

      <div className="shrink-0 border-t p-2">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                className="disabled:cursor-not-allowed px-2 cursor-pointer max-w-40 w-full"
                data-test-id="create-row-cancel-btn"
                disabled={isSubmitting}
                onClick={() => {
                  sidebar.setOpen(false);
                  navigate({
                    to: '/tables/$slug',
                    replace: true,
                    params: { slug: table.slug },
                  });
                }}
              >
                <span>Cancelar</span>
              </Button>
              <Button
                type="button"
                className="disabled:cursor-not-allowed px-2 cursor-pointer max-w-40 w-full"
                data-test-id="create-row-submit-btn"
                disabled={!canSubmit || isUploading}
                onClick={() => form.handleSubmit()}
              >
                {isSubmitting && <Spinner />}
                <span>Criar</span>
              </Button>
            </div>
          )}
        />
      </div>
    </React.Fragment>
  );
}
