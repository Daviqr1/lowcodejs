import { useMutation } from '@tanstack/react-query';
import {
  createLazyFileRoute,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import type { z } from 'zod';

import { FieldDetailSkeleton } from './-field-detail-skeleton';
import {
  FieldNativeUpdateSchema,
  FieldUpdateSchema,
  UpdateFieldFormFields,
} from './-update-form';
import { FieldView } from './-view';

import { FormFooter } from '@/components/common/form-footer';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { AccessDenied } from '@/components/common/route-status/access-denied';
import { LoadError } from '@/components/common/route-status/load-error';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useFieldRead } from '@/hooks/tanstack-query/use-field-read';
import { useGroupFieldUpdate } from '@/hooks/tanstack-query/use-group-field-update';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useTablePermission } from '@/hooks/use-table-permission';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { API } from '@/lib/api';
import type { E_FIELD_FORMAT } from '@/lib/constant';
import { E_FIELD_TYPE, E_PERMISSION_TARGET } from '@/lib/constant';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';
import type { IField, ITable, Paginated, ValueOf } from '@/lib/interfaces';
import { isFieldShownInContext } from '@/lib/permission';
import { QueryClient as queryClient } from '@/lib/query-client';

// Deriva o binding de visibilidade a partir do boolean showIn* legado (usado
// quando o campo ainda não tem o mapa permissions).
function bindingFromBool(visible: boolean): {
  kind: ValueOf<typeof E_PERMISSION_TARGET>;
  group: string | null;
} {
  if (visible) return { kind: E_PERMISSION_TARGET.PUBLIC, group: null };
  return { kind: E_PERMISSION_TARGET.NOBODY, group: null };
}

function normalizeDefaultValue(
  type: string,
  defaultValue: string | Array<string>,
): string | Array<string> | null {
  const arrayTypes: Array<string> = [
    E_FIELD_TYPE.DROPDOWN,
    E_FIELD_TYPE.CATEGORY,
    E_FIELD_TYPE.USER,
    E_FIELD_TYPE.RELATIONSHIP,
  ];

  if (arrayTypes.includes(type)) {
    if (Array.isArray(defaultValue)) {
      if (defaultValue.length > 0) return defaultValue;
      return null;
    }
    if (defaultValue) return [defaultValue];
    return null;
  }

  // TEXT_SHORT, TEXT_LONG, DATE → string
  if (Array.isArray(defaultValue)) {
    if (defaultValue.length > 0) return defaultValue[0];
    return null;
  }
  return defaultValue || null;
}

function normalizeTip(tip: string): string | null {
  const normalized = tip.trim();
  if (normalized.length > 0) return normalized;
  return null;
}

export const Route = createLazyFileRoute(
  '/_private/tables/$slug/field/$fieldId/',
)({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const sidebar = useSidebar();
  const navigate = useNavigate();

  const { slug, fieldId } = useParams({
    from: '/_private/tables/$slug/field/$fieldId/',
  });

  const { group: groupSlug } = useSearch({
    from: '/_private/tables/$slug/field/$fieldId/',
  });

  const table = useReadTable({ slug });
  const _read = useFieldRead({ tableSlug: slug, fieldId, groupSlug });
  const permission = useTablePermission(table.data);

  const [mode, setMode] = React.useState<'show' | 'edit'>('show');

  // Loading enquanto verifica permissão
  if (table.status === 'pending' || permission.isLoading) {
    return <FieldDetailSkeleton />;
  }

  // Mostrar erro se não tem permissão
  if (!permission.can('UPDATE_FIELD')) {
    return <AccessDenied />;
  }

  const goBack = (): void => {
    sidebar.setOpen(false);
    navigate({
      to: '/tables/$slug',
      replace: true,
      params: { slug },
    });
  };

  let headerTitle = 'Detalhes do campo';
  if (
    _read.status === 'success' &&
    _read.data.type === E_FIELD_TYPE.FIELD_GROUP
  ) {
    headerTitle = 'Detalhes do grupo de campos';
  }

  return (
    <PageShell data-test-id="field-detail-page">
      {/* Header */}
      <PageShell.Header borderBottom={false}>
        <PageHeader
          onBack={goBack}
          title={headerTitle}
        >
          {_read.status === 'success' &&
            mode === 'show' &&
            permission.can('UPDATE_FIELD') &&
            !_read.data.trashed &&
            (!_read.data.locked ||
              _read.data.native ||
              _read.data.type === E_FIELD_TYPE.DROPDOWN) && (
              <Button
                type="button"
                className="px-2 cursor-pointer"
                size="sm"
                data-test-id="field-edit-btn"
                onClick={() => setMode('edit')}
              >
                <PencilIcon className="size-4 mr-1" />
                <span>Editar</span>
              </Button>
            )}
        </PageHeader>
      </PageShell.Header>

      {/* Info text for field group */}
      {_read.status === 'success' &&
        _read.data.type === E_FIELD_TYPE.FIELD_GROUP && (
          <p className="text-sm text-muted-foreground px-2 pb-2">
            O grupo de campos é composto por outros campos que devem ser
            configurados nas configurações da tabela em "Gerenciar grupo de
            campos".
          </p>
        )}
      {_read.status === 'success' &&
        _read.data.locked &&
        !_read.data.native && (
          <p className="text-sm text-amber-600 px-2 pb-2">
            Este campo faz parte de uma predefinição e não pode ser alterado ou
            removido.
          </p>
        )}
      {_read.status === 'success' && _read.data.native && (
        <p className="text-sm text-muted-foreground px-2 pb-2">
          Campo nativo: você pode personalizar apenas o rótulo de exibição. O
          nome interno e o identificador permanecem fixos.
        </p>
      )}
      {_read.status === 'success' &&
        _read.data.type === E_FIELD_TYPE.RELATIONSHIP &&
        !_read.data.relationship?.table?._id && (
          <p className="text-sm text-destructive px-2 pb-2">
            Relacionamento não configurado: a tabela vinculada foi removida.
            Este campo pode ser enviado para a lixeira usando o botão abaixo.
          </p>
        )}

      {/* Content */}
      <PageShell.Content className="overflow-hidden">
        {_read.status === 'error' && (
          <LoadError
            message="Houve um erro ao buscar dados do campo"
            refetch={_read.refetch}
          />
        )}
        {_read.status === 'pending' && (
          <div className="p-4">
            <FieldDetailSkeleton />
          </div>
        )}
        {_read.status === 'success' && (
          <FieldUpdateContent
            data={_read.data}
            table={table.data}
            slug={slug}
            mode={mode}
            setMode={setMode}
            groupSlug={groupSlug}
          />
        )}
      </PageShell.Content>
    </PageShell>
  );
}

interface FieldUpdateContentProps {
  data: IField;
  table?: ITable;
  slug: string;
  mode: 'show' | 'edit';
  setMode: React.Dispatch<React.SetStateAction<'show' | 'edit'>>;
  /** Slug do grupo (quando em contexto de grupo) */
  groupSlug?: string;
}

function FieldUpdateContent({
  data,
  table,
  slug,
  mode,
  setMode,
  groupSlug,
}: FieldUpdateContentProps): React.JSX.Element {
  const sidebar = useSidebar();
  const navigate = useNavigate();

  const goBack = (): void => {
    sidebar.setOpen(false);
    navigate({
      to: '/tables/$slug',
      replace: true,
      params: { slug },
    });
  };

  const handleUpdateSuccess = (response: IField): void => {
    const wasTrashed = Boolean(data.trashed);
    const isTrashed = Boolean(response.trashed);

    if (!wasTrashed && isTrashed) {
      toast.warning('Campo enviado para lixeira', {
        description:
          'O campo foi enviado para a lixeira. Para restaurá-lo, acesse o gerenciamento de campos.',
      });
    } else if (wasTrashed && !isTrashed) {
      toast.success('Campo restaurado', {
        description:
          'O campo foi restaurado. Para enviá-lo à lixeira, acesse o gerenciamento de campos.',
      });
    } else {
      toast.success('Campo atualizado', {
        description: 'Os dados do campo foram atualizados com sucesso',
      });
    }

    form.reset();
    setMode('show');
  };

  const handleUpdateError = (error: Error): void => {
    handleApiError(error, {
      context: 'Erro ao atualizar o campo',
      onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
    });
  };

  const isBrokenRelationship =
    data.type === E_FIELD_TYPE.RELATIONSHIP &&
    !data.relationship?.table?._id &&
    !data.trashed;

  const _trash = useMutation({
    mutationFn: async () => {
      await API.patch(`/tables/${slug}/fields/${data._id}/trash`);
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(slug),
      });
      toast.warning('Campo enviado para lixeira', {
        description: 'O campo foi enviado para a lixeira.',
      });
      goBack();
    },
    onError(error: Error) {
      handleApiError(error, { context: 'Erro ao enviar campo para lixeira' });
    },
  });

  const _update = useMutation({
    mutationFn: async (
      payload: Partial<IField> & {
        trashed?: boolean;
        trashedAt?: string | null;
      },
    ) => {
      const response = await API.put<IField>(
        `/tables/${slug}/fields/${data._id}`,
        payload,
      );
      return response.data;
    },
    onSuccess(response) {
      queryClient.setQueryData<IField>(
        queryKeys.fields.detail(slug, response._id),
        response,
      );

      queryClient.setQueryData<ITable>(queryKeys.tables.detail(slug), (old) => {
        if (!old) return old;
        return {
          ...old,
          fields: old.fields.map((f) => {
            if (f._id === response._id) return response;
            return f;
          }),
        };
      });

      queryClient.setQueryData<Paginated<ITable>>(
        queryKeys.tables.list({ page: 1, perPage: 50 }),
        (old) => {
          if (!old) return old;
          return {
            meta: old.meta,
            data: old.data.map((t) => {
              if (t.slug === slug) {
                return {
                  ...t,
                  fields: t.fields.map((f) => {
                    if (f._id === response._id) return response;
                    return f;
                  }),
                };
              }
              return t;
            }),
          };
        },
      );

      // Invalidar cache da tabela para refletir mudancas em groups (ex: nome do grupo)
      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(slug),
      });

      handleUpdateSuccess(response);
    },
    onError: handleUpdateError,
  });

  const _updateGroupField = useGroupFieldUpdate({
    onSuccess: handleUpdateSuccess,
    onError: handleUpdateError,
  });

  // Campo nativo valida só o rótulo; name/slug/type são fixos e não devem
  // reprovar o form (slugs nativos não passam na regra de slug de usuário).
  let validationSchema: z.ZodType = FieldUpdateSchema;
  if (data.native) validationSchema = FieldNativeUpdateSchema;

  const form = useAppForm({
    defaultValues: {
      name: data.name,
      slug: data.slug,
      tip: data.tip ?? '',
      label: {
        list: data.label?.list ?? '',
        filter: data.label?.filter ?? '',
        form: data.label?.form ?? '',
        detail: data.label?.detail ?? '',
      },
      type: data.type,
      format: data.format ?? '',
      validations: data.validations ?? [],
      defaultValue: ((): string => {
        if (Array.isArray(data.defaultValue)) return data.defaultValue[0] ?? '';
        return data.defaultValue ?? '';
      })(),
      dropdown: (data.dropdown ?? []).map((d) => ({
        id: d.id,
        label: d.label,
        color: d.color,
      })),
      allowCustomDropdownOptions: data.allowCustomDropdownOptions ?? false,
      allowCreateRelationshipRecords:
        data.allowCreateRelationshipRecords ?? false,
      relationship: {
        tableId: data.relationship?.table?._id ?? '',
        tableSlug: data.relationship?.table?.slug ?? '',
        fieldId: data.relationship?.field?._id ?? '',
        fieldSlug: data.relationship?.field?.slug ?? '',
        order: data.relationship?.order ?? '',
        customLabel: data.relationship?.customLabel ?? false,
        labelParts: data.relationship?.labelParts ?? [],
        labelSeparator: data.relationship?.labelSeparator ?? ' - ',
        sourceVisible: data.relationship?.visible ?? true,
        mirrorMultiple: data.relationship?.mirror?.multiple ?? false,
        mirrorVisible: data.relationship?.mirror?.visible ?? false,
        mirrorLabel: data.relationship?.mirror?.label ?? '',
        onDelete: data.relationship?.onDelete ?? 'SET_NULL',
        formMode: data.relationship?.formMode ?? 'select',
        max: data.relationship?.max ?? null,
      },
      category: data.category ?? [],
      multiple: data.multiple,
      showInFilter: data.showInFilter,
      permissions: data.permissions ?? {
        list: bindingFromBool(isFieldShownInContext(data, 'list')),
        form: bindingFromBool(isFieldShownInContext(data, 'form')),
        detail: bindingFromBool(isFieldShownInContext(data, 'detail')),
      },
      required: data.required,
      trashed: Boolean(data.trashed),
      widthInForm: data.widthInForm ?? 50,
      widthInList: data.widthInList ?? 10,
      htmlContent: data.htmlContent ?? '',
    },
    // @ts-expect-error Zod Standard Schema type inference
    validators: { onChange: validationSchema, onSubmit: validationSchema },
    onSubmit: async ({ value }) => {
      if (_update.status === 'pending' || _updateGroupField.isPending) return;

      const hasRelationship = value.relationship.tableId !== '';
      const hasDropdown = (value.dropdown?.length ?? 0) > 0;
      const hasCategory = (value.category?.length ?? 0) > 0;

      let htmlContent: string | null = null;
      if (value.type === E_FIELD_TYPE.HTML_CONTENT) {
        htmlContent = value.htmlContent || null;
      }

      // Rótulo por contexto: vazio → null (volta ao name naquele contexto).
      const labelList = value.label.list?.trim() || null;
      const labelFilter = value.label.filter?.trim() || null;
      const labelForm = value.label.form?.trim() || null;
      const labelDetail = value.label.detail?.trim() || null;

      let nextLabel: {
        list: string | null;
        filter: string | null;
        form: string | null;
        detail: string | null;
      } | null = null;
      if (labelList || labelFilter || labelForm || labelDetail) {
        nextLabel = {
          list: labelList,
          filter: labelFilter,
          form: labelForm,
          detail: labelDetail,
        };
      }

      let required = value.required;
      if (value.trashed) required = false;

      // value.format vem do formulário como string; o campo aceita o enum.
      let format: ValueOf<typeof E_FIELD_FORMAT> | null = null;
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      if (value.format) format = value.format as ValueOf<typeof E_FIELD_FORMAT>;

      let dropdown: typeof value.dropdown = [];
      if (hasDropdown) dropdown = value.dropdown.map((item) => item);

      let allowCustomDropdownOptions = false;
      if (value.type === E_FIELD_TYPE.DROPDOWN) {
        allowCustomDropdownOptions = value.allowCustomDropdownOptions;
      }

      let allowCreateRelationshipRecords = false;
      if (value.type === E_FIELD_TYPE.RELATIONSHIP) {
        allowCreateRelationshipRecords = value.allowCreateRelationshipRecords;
      }

      let relationship: IField['relationship'] = null;
      if (hasRelationship) {
        let labelParts: typeof value.relationship.labelParts = [];
        if (value.relationship.customLabel) {
          labelParts = value.relationship.labelParts;
        }
        relationship = {
          table: {
            _id: value.relationship.tableId,
            slug: value.relationship.tableSlug,
          },
          field: {
            _id: value.relationship.fieldId,
            slug: value.relationship.fieldSlug,
          },
          // order vem do form como string; reduz à união literal.
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          order: (value.relationship.order || 'asc') as 'asc' | 'desc',
          customLabel: value.relationship.customLabel,
          labelParts,
          labelSeparator: value.relationship.labelSeparator || ' - ',
          visible: value.relationship.sourceVisible,
          onDelete: value.relationship.onDelete,
          mirror: {
            multiple: value.relationship.mirrorMultiple,
            visible: value.relationship.mirrorVisible,
            label: value.relationship.mirrorLabel || undefined,
          },
          formMode: value.relationship.formMode,
          max: value.relationship.max ?? null,
        };
      }

      let category: typeof value.category = [];
      if (hasCategory) category = value.category;

      let trashedAt: string | null = null;
      if (value.trashed) trashedAt = new Date().toISOString();

      const payload: Partial<IField> & {
        trashed?: boolean;
        trashedAt?: string | null;
      } = {
        name: value.name,
        tip: normalizeTip(value.tip),
        label: nextLabel,
        type: value.type,
        required,
        multiple: value.multiple,
        showInFilter: value.showInFilter,
        permissions: value.permissions,
        widthInForm: value.widthInForm,
        widthInList: value.widthInList,
        format,
        validations: value.validations,
        defaultValue: normalizeDefaultValue(value.type, value.defaultValue),
        dropdown,
        allowCustomDropdownOptions,
        allowCreateRelationshipRecords,
        relationship,
        category,
        htmlContent,
        trashed: value.trashed,
        trashedAt,
      };

      // slug e a "url"/chave tecnica, editavel so em campos nao-nativos. Campos
      // nativos tem slug camelCase fixo (ignorado pelo backend) e nao deve ser
      // enviado para nao reprovar na validacao kebab-case do update.
      if (!data.native) payload.slug = value.slug;

      if (groupSlug) {
        await _updateGroupField.mutateAsync({
          tableSlug: slug,
          groupSlug,
          fieldId: data._id,
          data: payload,
        });
      } else {
        await _update.mutateAsync(payload);
      }
    },
  });

  useApiErrorAutoClear(form);

  const isPending = _update.status === 'pending' || _updateGroupField.isPending;

  return (
    <>
      {mode === 'show' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-auto">
          <FieldView data={data} />
        </div>
      )}

      {/* Footer - Show Mode */}
      {mode === 'show' && (
        <PageShell.Footer className="bg-sidebar">
          <div className="flex justify-end gap-2">
            {isBrokenRelationship && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="px-2 cursor-pointer max-w-40 w-full"
                disabled={_trash.status === 'pending'}
                onClick={() => _trash.mutate()}
              >
                <Trash2Icon className="size-4 mr-1" />
                <span>Enviar para lixeira</span>
              </Button>
            )}
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
        </PageShell.Footer>
      )}

      {mode === 'edit' && (
        <form
          className="flex-1 flex flex-col min-h-0 overflow-auto"
          data-test-id="field-update-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          {/* @ts-ignore TanStack Form type depth issue with nested configuration */}
          <UpdateFieldFormFields
            form={form}
            isPending={isPending}
            mode={mode}
            tableSlug={slug}
            table={table}
            targetField={data}
            isLocked={data.locked ?? false}
            isNative={data.native ?? false}
            isGroupField={Boolean(groupSlug)}
          />
        </form>
      )}

      {/* Footer */}
      {mode === 'edit' && (
        <PageShell.Footer className="bg-sidebar">
          <FormFooter
            form={form}
            onCancel={() => {
              form.reset();
              setMode('show');
            }}
            submitLabel="Salvar"
            submitTestId="field-update-submit-btn"
          />
        </PageShell.Footer>
      )}
    </>
  );
}
