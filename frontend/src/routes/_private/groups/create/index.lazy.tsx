import {
  createLazyFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { toast } from 'sonner';

import {
  CreateGroupFormFields,
  GroupCreateSchema,
  groupFormDefaultValues,
} from './-create-form';

import { FormFooter } from '@/components/common/form-footer';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { useSidebar } from '@/components/ui/sidebar';
import { useCreateGroup } from '@/hooks/tanstack-query/use-group-create';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';

export const Route = createLazyFileRoute('/_private/groups/create/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const sidebar = useSidebar();
  const router = useRouter();
  const navigate = useNavigate();

  const _create = useCreateGroup({
    onSuccess() {
      toast.success('Grupo criado', {
        description: 'O grupo foi criado com sucesso',
      });

      form.reset();
      navigate({ to: '/groups', search: { page: 1, perPage: 50 } });
      sidebar.setOpen(true);
      router.invalidate();
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao criar o grupo',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
      });
    },
  });

  const form = useAppForm({
    defaultValues: groupFormDefaultValues,
    validators: {
      // @ts-expect-error Zod Standard Schema type inference
      onChange: GroupCreateSchema,
      // @ts-expect-error Zod Standard Schema type inference
      onSubmit: GroupCreateSchema,
    },
    onSubmit: async ({ value }) => {
      if (_create.status === 'pending') return;

      await _create.mutateAsync({
        name: value.name,
        description: value.description || null,
        permissions: value.permissions,
        encompasses: value.encompasses,
      });
    },
  });

  useApiErrorAutoClear(form);

  const isPending = _create.status === 'pending';

  const goBack = (): void => {
    sidebar.setOpen(true);
    router.navigate({
      to: '/groups',
      replace: true,
      search: { page: 1, perPage: 50 },
    });
  };

  return (
    <PageShell data-test-id="create-group-page">
      <PageShell.Header>
        <PageHeader
          onBack={goBack}
          title="Criar novo grupo"
        />
      </PageShell.Header>

      <PageShell.Content>
        <form
          data-test-id="create-group-form"
          className="flex-1 flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <CreateGroupFormFields
            form={form}
            isPending={isPending}
          />
        </form>
      </PageShell.Content>

      <PageShell.Footer>
        <FormFooter
          form={form}
          onCancel={() =>
            navigate({ to: '/groups', search: { page: 1, perPage: 50 } })
          }
          submitLabel="Criar"
          submitTestId="create-group-submit-btn"
          cancelTestId="create-group-cancel-btn"
        />
      </PageShell.Footer>
    </PageShell>
  );
}
