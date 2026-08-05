import {
  createLazyFileRoute,
  useParams,
  useRouter,
} from '@tanstack/react-router';
import { toast } from 'sonner';

import {
  MethodsFormFields,
  tableMethodsFormDefaultValues,
} from './-methods-form';

import { PageHeader, PageShell } from '@/components/common/page-shell';
import { AccessDenied } from '@/components/common/route-status/access-denied';
import { LoadError } from '@/components/common/route-status/load-error';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useUpdateTable } from '@/hooks/tanstack-query/use-table-update';
import { useTablePermission } from '@/hooks/use-table-permission';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import type { ITable } from '@/lib/interfaces';
import { getQueryClient } from '@/lib/query-client';

export const Route = createLazyFileRoute('/_private/tables/$slug/methods')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const { slug } = useParams({ from: '/_private/tables/$slug/methods' });
  const sidebar = useSidebar();
  const router = useRouter();
  const table = useReadTable({ slug });
  const permission = useTablePermission(table.data);

  // Loading enquanto verifica permissão
  if (table.status === 'pending' || permission.isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-75 w-full" />
        <Skeleton className="h-10 w-32 ml-auto" />
      </div>
    );
  }

  // Mostrar erro se não tem permissão
  if (!permission.can('UPDATE_TABLE')) {
    return <AccessDenied />;
  }

  const goBack = (): void => {
    sidebar.setOpen(false);
    router.navigate({
      to: '/tables/$slug',
      replace: true,
      params: { slug },
    });
  };

  return (
    <PageShell data-test-id="methods-page">
      {/* Header */}
      <PageShell.Header borderBottom={false}>
        <PageHeader
          onBack={goBack}
          title="Métodos da tabela"
        />
      </PageShell.Header>

      {/* Content */}
      <PageShell.Content className="overflow-hidden">
        {table.status === 'error' && (
          <LoadError
            message="Erro ao buscar dados da tabela"
            refetch={table.refetch}
          />
        )}
        {table.status === 'success' && (
          <MethodsFormContent
            data={table.data}
            tableSlug={slug}
          />
        )}
      </PageShell.Content>
    </PageShell>
  );
}

type MethodsFormContentProps = {
  data: ITable;
  tableSlug: string;
};

function MethodsFormContent({
  data,
  tableSlug,
}: MethodsFormContentProps): React.JSX.Element {
  const table = useReadTable({ slug: tableSlug });
  const permission = useTablePermission(table.data);
  const canEdit = permission.can('UPDATE_TABLE');

  const _update = useUpdateTable({
    onSuccess(response) {
      getQueryClient().setQueryData<ITable>(
        queryKeys.tables.detail(tableSlug),
        response,
      );

      toast.info('Métodos atualizados', {
        description: 'Os métodos da tabela foram atualizados com sucesso',
      });
    },
    onError() {
      toast.error('Erro ao atualizar métodos', {
        description: 'Não foi possível atualizar os métodos da tabela',
      });
    },
  });

  const form = useAppForm({
    defaultValues: {
      ...tableMethodsFormDefaultValues,
      onLoad: data.methods.onLoad.code ?? '',
      beforeSave: data.methods.beforeSave.code ?? '',
      afterSave: data.methods.afterSave.code ?? '',
    },
    onSubmit: async ({ value }) => {
      if (_update.status === 'pending') return;

      await _update.mutateAsync({
        routeSlug: tableSlug,
        name: data.name,
        description: data.description,
        logo: data.logo?._id ?? null,
        style: data.style,
        fieldOrderList: data.fieldOrderList,
        fieldOrderForm: data.fieldOrderForm,
        fieldOrderFilter: data.fieldOrderFilter,
        fieldOrderDetail: data.fieldOrderDetail,
        methods: {
          onLoad: {
            code: value.onLoad || null,
          },
          beforeSave: {
            code: value.beforeSave || null,
          },
          afterSave: {
            code: value.afterSave || null,
          },
        },
      });
    },
  });

  const isPending = _update.status === 'pending';

  return (
    <>
      <form
        className="flex-1 flex flex-col min-h-0 overflow-auto"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <MethodsFormFields
          form={form}
          isPending={isPending}
          table={data}
        />
      </form>

      {/* Footer com botões */}
      {canEdit && (
        <PageShell.Footer>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <div className="flex justify-end">
                <Button
                  type="button"
                  className="w-full max-w-3xs"
                  data-test-id="methods-submit-btn"
                  disabled={!canSubmit}
                  onClick={() => form.handleSubmit()}
                >
                  {isSubmitting && <Spinner />}
                  <span>Salvar Métodos</span>
                </Button>
              </div>
            )}
          />
        </PageShell.Footer>
      )}
    </>
  );
}
