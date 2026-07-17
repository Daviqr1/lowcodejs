import {
  createLazyFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { toast } from 'sonner';

import {
  CreateTableFormFields,
  TableCreateSchema,
  tableCreateFormDefaultValues,
} from './-create-form';
import { CreateTableFormSkeleton } from './-create-form-skeleton';

import {
  UploadingProvider,
  useIsUploading,
} from '@/components/common/file-upload/uploading-context';
import { FormFooter } from '@/components/common/form-footer';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { AccessDenied } from '@/components/common/route-status/access-denied';
import { useSidebar } from '@/components/ui/sidebar';
import { useCreateTable } from '@/hooks/tanstack-query/use-table-create';
import { usePermission } from '@/hooks/use-table-permission';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';

export const Route = createLazyFileRoute('/_private/tables/create/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  return (
    <UploadingProvider>
      <RouteComponentContent />
    </UploadingProvider>
  );
}

function RouteComponentContent(): React.JSX.Element {
  const sidebar = useSidebar();
  const router = useRouter();
  const navigate = useNavigate();
  const permission = usePermission();
  const isUploading = useIsUploading();

  const _create = useCreateTable({
    onSuccess(response) {
      toast.success('Tabela criada', {
        description: 'A tabela foi criada com sucesso',
      });

      form.reset();
      navigate({
        to: '/tables/$slug',
        params: { slug: response.slug },
      });
      sidebar.setOpen(true);
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao criar a tabela',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
      });
    },
  });

  const form = useAppForm({
    defaultValues: tableCreateFormDefaultValues,
    validators: {
      // @ts-expect-error Zod Standard Schema type inference
      onChange: TableCreateSchema,
      // @ts-expect-error Zod Standard Schema type inference
      onSubmit: TableCreateSchema,
    },
    onSubmit: async ({ value }) => {
      if (_create.status === 'pending') return;

      await _create.mutateAsync({
        name: value.name.trim(),
        slug: value.slug.trim() || undefined,
        logo: value.logo,
        style: value.style,
      });
    },
  });

  useApiErrorAutoClear(form);

  const isPending = _create.status === 'pending';

  const goBack = (): void => {
    sidebar.setOpen(true);
    router.navigate({
      to: '/tables',
      replace: true,
      search: { page: 1, perPage: 50 },
    });
  };

  return (
    <PageShell data-test-id="create-table-page">
      {/* Header */}
      <PageShell.Header borderBottom={false}>
        <PageHeader
          title="Nova tabela"
          onBack={goBack}
        />
      </PageShell.Header>

      {/* Content */}
      <PageShell.Content>
        {permission.isLoading && <CreateTableFormSkeleton />}
        {!permission.isLoading && !permission.can('CREATE_TABLE') && (
          <AccessDenied />
        )}
        {!permission.isLoading && permission.can('CREATE_TABLE') && (
          <form
            className="flex-1 flex flex-col"
            data-test-id="create-table-form"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <CreateTableFormFields
              form={form}
              isPending={isPending}
            />
          </form>
        )}
      </PageShell.Content>

      {/* Footer com botões */}
      {!permission.isLoading && permission.can('CREATE_TABLE') && (
        <PageShell.Footer>
          <FormFooter
            form={form}
            cancelTestId="create-table-cancel-btn"
            submitTestId="create-table-submit-btn"
            submitLabel="Criar"
            submitDisabled={isUploading}
            onCancel={() => {
              navigate({
                to: '/tables',
                search: { page: 1, perPage: 50 },
              });
            }}
          />
        </PageShell.Footer>
      )}
    </PageShell>
  );
}
