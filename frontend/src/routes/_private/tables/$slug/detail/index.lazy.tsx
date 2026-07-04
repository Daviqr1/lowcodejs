import {
  createLazyFileRoute,
  useParams,
  useRouter,
} from '@tanstack/react-router';
import { ArchiveRestoreIcon, PencilIcon, TrashIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import {
  TableUpdateSchema,
  UpdateTableFormFields,
  buildDefaultPermissions,
} from './-update-form';
import { UpdateTableFormSkeleton } from './-update-form-skeleton';
import { TableView } from './-view';

import { ActionDialog } from '@/components/common/action-dialog';
import { FormFooter } from '@/components/common/form-footer';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { AccessDenied } from '@/components/common/route-status/access-denied';
import { LoadError } from '@/components/common/route-status/load-error';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useUpdateTable } from '@/hooks/tanstack-query/use-table-update';
import { useTablePermission } from '@/hooks/use-table-permission';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { API } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';
import type { ITable } from '@/lib/interfaces';

export const Route = createLazyFileRoute('/_private/tables/$slug/detail/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const { slug } = useParams({ from: '/_private/tables/$slug/detail/' });
  const sidebar = useSidebar();
  const router = useRouter();
  const _read = useReadTable({ slug });
  const permission = useTablePermission(_read.data);

  const [mode, setMode] = React.useState<'show' | 'edit'>('show');

  // Loading enquanto verifica permissão
  if (_read.status === 'pending' || permission.isLoading) {
    return <UpdateTableFormSkeleton />;
  }

  // Mostrar erro se não tem permissão
  if (!permission.can('UPDATE_TABLE')) {
    return <AccessDenied />;
  }

  const goBack = (): void => {
    sidebar.setOpen(false);
    router.navigate({
      to: '/tables/$slug',
      params: { slug },
      replace: true,
    });
  };

  return (
    <PageShell data-test-id="table-detail-view-page">
      {/* Header */}
      <PageShell.Header borderBottom={false}>
        <PageHeader
          onBack={goBack}
          title="Detalhes da tabela"
        />
      </PageShell.Header>

      {/* Content */}
      <PageShell.Content className="overflow-hidden">
        {_read.status === 'error' && (
          <LoadError
            message="Erro ao buscar dados da tabela"
            refetch={_read.refetch}
          />
        )}
        {_read.status === 'success' && (
          <TableUpdateContent
            data={_read.data}
            mode={mode}
            setMode={setMode}
            permission={permission}
          />
        )}
      </PageShell.Content>
    </PageShell>
  );
}

interface TableUpdateContentProps {
  data: ITable;
  mode: 'show' | 'edit';
  setMode: React.Dispatch<React.SetStateAction<'show' | 'edit'>>;
  permission: ReturnType<typeof useTablePermission>;
}

function TableUpdateContent({
  data,
  mode,
  setMode,
  permission,
}: TableUpdateContentProps): React.JSX.Element {
  const sidebar = useSidebar();
  const router = useRouter();
  const _update = useUpdateTable({
    onSuccess(responseData) {
      toast.success('Tabela atualizada', {
        description: 'Os dados da tabela foram atualizados com sucesso',
      });

      sidebar.setOpen(false);
      router.navigate({
        to: '/tables/$slug',
        params: { slug: responseData.slug },
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao atualizar a tabela',
      });
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: data.name,
      slug: data.slug,
      description: data.description ?? '',
      style: data.style,
      logo: data.logo?._id ?? null,
      logoFile: new Array<File>(),
      // Garante as 10 chaves (default Ninguém) e sobrepõe com o que a tabela tem.
      permissions: {
        ...buildDefaultPermissions(),
        ...(data.permissions ?? {}),
      },
      members: data.members ?? [],
      owner: data.owner?._id ?? '',
      order:
        (data.order?.field &&
          data.order?.direction &&
          `${data.order.field}:${data.order.direction}`) ||
        'none',
      layoutFields: {
        title: data.layoutFields?.title ?? '',
        description: data.layoutFields?.description ?? '',
        cover: data.layoutFields?.cover ?? '',
        category: data.layoutFields?.category ?? '',
        startDate: data.layoutFields?.startDate ?? '',
        endDate: data.layoutFields?.endDate ?? '',
        color: data.layoutFields?.color ?? '',
        participants: data.layoutFields?.participants ?? '',
        reminder: data.layoutFields?.reminder ?? '',
      },
      rowSlugFieldId: data.rowSlugFieldId ?? null,
    },
    // @ts-expect-error Zod Standard Schema type inference
    validators: { onChange: TableUpdateSchema, onSubmit: TableUpdateSchema },
    onSubmit: async ({ value }) => {
      if (_update.status === 'pending') return;

      let orderPayload: { field: string; direction: 'asc' | 'desc' } | null =
        null;
      if (value.order && value.order !== 'none') {
        const [field, direction] = value.order.split(':');
        orderPayload = {
          field,
          // direction vem do split de value.order (formato `campo:asc|desc`).
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          direction: direction as 'asc' | 'desc',
        };
      }

      await _update.mutateAsync({
        routeSlug: data.slug,
        slug: value.slug.trim() || undefined,
        name: value.name || data.name,
        description: value.description || null,
        logo: value.logo || data.logo?._id || null,
        style: value.style,
        fieldOrderList: data.fieldOrderList,
        fieldOrderForm: data.fieldOrderForm,
        fieldOrderFilter: data.fieldOrderFilter,
        fieldOrderDetail: data.fieldOrderDetail,
        permissions: value.permissions,
        members: value.members,
        owner: value.owner || undefined,
        methods: {
          ...data.methods,
        },
        order: orderPayload,
        layoutFields: {
          title: value.layoutFields.title || null,
          description: value.layoutFields.description || null,
          cover: value.layoutFields.cover || null,
          category: value.layoutFields.category || null,
          startDate: value.layoutFields.startDate || null,
          endDate: value.layoutFields.endDate || null,
          color: value.layoutFields.color || null,
          participants: value.layoutFields.participants || null,
          reminder: value.layoutFields.reminder || null,
        },
        rowSlugFieldId: value.rowSlugFieldId || null,
      });
    },
  });

  const isPending = _update.status === 'pending';

  return (
    <>
      {mode === 'show' && (
        <div className="shrink-0 px-2 pb-2 flex flex-row justify-end gap-1">
          {!data.trashed && permission.can('REMOVE_TABLE') && (
            <ActionDialog
              asChild
              config={{
                mutationFn: async function () {
                  await API.patch(
                    '/tables/'.concat(data.slug).concat('/trash'),
                  );
                },
                invalidateKeys: [
                  queryKeys.tables.detail(data.slug),
                  queryKeys.tables.lists(),
                ],
                toast: {
                  title: 'Tabela enviada para lixeira!',
                  description: 'A tabela foi movida para a lixeira',
                },
                navigation: {
                  to: '/tables',
                  search: { page: 1, perPage: 50 },
                },
                errorContext: 'Erro ao enviar tabela para lixeira',
                title: 'Enviar tabela para a lixeira',
                description:
                  'Ao confirmar essa ação, a tabela será enviada para a lixeira',
                testId: 'trash-table-dialog',
                confirmTestId: 'trash-table-confirm-btn',
              }}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
              >
                <TrashIcon className="size-4" />
                <span>Enviar para lixeira</span>
              </Button>
            </ActionDialog>
          )}
          {data.trashed && permission.can('UPDATE_TABLE') && (
            <ActionDialog
              asChild
              config={{
                mutationFn: async function () {
                  await API.patch(
                    '/tables/'.concat(data.slug).concat('/restore'),
                  );
                },
                invalidateKeys: [
                  queryKeys.tables.detail(data.slug),
                  queryKeys.tables.lists(),
                ],
                toast: {
                  title: 'Tabela restaurada!',
                  description: 'A tabela foi restaurada da lixeira',
                },
                errorContext: 'Erro ao restaurar tabela da lixeira',
                title: 'Restaurar tabela da lixeira',
                description:
                  'Ao confirmar essa ação, a tabela será restaurada da lixeira',
                testId: 'restore-table-dialog',
                confirmTestId: 'restore-table-confirm-btn',
              }}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
              >
                <ArchiveRestoreIcon className="size-4" />
                <span>Restaurar</span>
              </Button>
            </ActionDialog>
          )}
          {data.trashed && permission.can('REMOVE_TABLE') && (
            <ActionDialog
              asChild
              config={{
                mutationFn: async function () {
                  await API.delete('/tables/'.concat(data.slug));
                },
                invalidateKeys: [
                  queryKeys.tables.detail(data.slug),
                  queryKeys.tables.lists(),
                ],
                toast: {
                  title: 'Tabela excluída permanentemente!',
                  description: 'A tabela foi excluída permanentemente',
                },
                navigation: {
                  to: '/tables',
                  search: { page: 1, perPage: 50 },
                },
                errorContext: 'Erro ao excluir tabela',
                title: 'Excluir tabela permanentemente',
                description:
                  'Essa ação é irreversível. A tabela será excluída permanentemente e não poderá ser recuperada.',
                testId: 'delete-table-dialog',
                cancelTestId: 'delete-table-cancel-btn',
                confirmTestId: 'delete-table-confirm-btn',
              }}
            >
              <Button
                type="button"
                variant="destructive"
                size="sm"
              >
                <TrashIcon className="size-4" />
                <span>Excluir permanentemente</span>
              </Button>
            </ActionDialog>
          )}
          {!data.trashed && permission.can('UPDATE_TABLE') && (
            <Button
              type="button"
              className="px-2 cursor-pointer max-w-40 w-full"
              size="sm"
              data-test-id="table-edit-btn"
              onClick={() => setMode('edit')}
            >
              <PencilIcon className="size-4 mr-1" />
              <span>Editar</span>
            </Button>
          )}
        </div>
      )}

      {mode === 'show' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-auto">
          <TableView data={data} />
        </div>
      )}

      {/* Footer - Show Mode */}
      {mode === 'show' && (
        <PageShell.Footer className="bg-sidebar">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-2 cursor-pointer max-w-40 w-full"
              onClick={() => {
                sidebar.setOpen(false);
                router.navigate({
                  to: '/tables/$slug',
                  params: { slug: data.slug },
                  replace: true,
                });
              }}
            >
              <span>Voltar</span>
            </Button>
          </div>
        </PageShell.Footer>
      )}

      {mode === 'edit' && (
        <form
          id="table-update-form"
          data-test-id="table-update-form"
          className="flex-1 flex flex-col min-h-0 overflow-auto"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <UpdateTableFormFields
            form={form}
            isPending={isPending}
            mode={mode}
            tableData={data}
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
            submitTestId="table-update-submit-btn"
            cancelTestId="table-update-cancel-btn"
          />
        </PageShell.Footer>
      )}
    </>
  );
}
