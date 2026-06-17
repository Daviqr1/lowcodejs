import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createLazyFileRoute,
  useParams,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import { PencilIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import type { GroupUpdateFormValues } from './-update-form';
import { GroupUpdateSchema, UpdateGroupFormFields } from './-update-form';
import { GroupView } from './-view';

import { FormFooter } from '@/components/common/form-footer';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { groupDetailOptions } from '@/hooks/tanstack-query/_query-options';
import { useUpdateGroup } from '@/hooks/tanstack-query/use-group-update';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';
import type { IGroup } from '@/lib/interfaces';

export const Route = createLazyFileRoute('/_private/groups/$groupId/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const { groupId } = useParams({
    from: '/_private/groups/$groupId/',
  });

  const sidebar = useSidebar();
  const router = useRouter();

  const { data } = useSuspenseQuery(groupDetailOptions(groupId));

  const search = useSearch({ from: '/_private/groups/$groupId/' });
  const [mode, setMode] = React.useState<'show' | 'edit'>(
    search.mode === 'edit' ? 'edit' : 'show',
  );

  const goBack = (): void => {
    sidebar.setOpen(true);
    router.navigate({
      to: '/groups',
      replace: true,
      search: { page: 1, perPage: 50 },
    });
  };

  return (
    <PageShell data-test-id="group-detail-page">
      <PageShell.Header borderBottom={false}>
        <PageHeader
          onBack={goBack}
          title="Detalhes do grupo"
        >
          {mode === 'show' && (
            <Button
              data-test-id="group-edit-btn"
              type="button"
              className="px-2 cursor-pointer max-w-40 w-full"
              size="sm"
              onClick={() => setMode('edit')}
            >
              <PencilIcon className="size-4 mr-1" />
              <span>Editar</span>
            </Button>
          )}
        </PageHeader>
      </PageShell.Header>

      <GroupUpdateContent
        data={data}
        mode={mode}
        setMode={setMode}
      />
    </PageShell>
  );
}

interface GroupUpdateContentProps {
  data: IGroup;
  mode: 'show' | 'edit';
  setMode: React.Dispatch<React.SetStateAction<'show' | 'edit'>>;
}

function GroupUpdateContent({
  data,
  mode,
  setMode,
}: GroupUpdateContentProps): React.JSX.Element {
  const sidebar = useSidebar();
  const router = useRouter();

  const goBack = (): void => {
    sidebar.setOpen(true);
    router.navigate({
      to: '/groups',
      replace: true,
      search: { page: 1, perPage: 50 },
    });
  };

  const _update = useUpdateGroup({
    onSuccess() {
      toast.success('Grupo atualizado', {
        description: 'Os dados do grupo foram atualizados com sucesso',
      });

      form.reset();
      setMode('show');
      router.invalidate();
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao atualizar o grupo',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
      });
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: data.name,
      description: data.description ?? '',
      permissions: data.permissions.map((p) => p._id),
    } satisfies GroupUpdateFormValues,
    // @ts-expect-error Zod Standard Schema type inference
    validators: { onChange: GroupUpdateSchema, onSubmit: GroupUpdateSchema },
    onSubmit: async ({ value }) => {
      if (_update.status === 'pending') return;

      await _update.mutateAsync({
        ...value,
        _id: data._id,
        description: value.description || null,
      });
    },
  });

  useApiErrorAutoClear(form);

  const isPending = _update.status === 'pending';

  return (
    <>
      {mode === 'show' && (
        <PageShell.Content>
          <GroupView data={data} />
        </PageShell.Content>
      )}

      {mode === 'show' && (
        <PageShell.Footer className="bg-sidebar">
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
        </PageShell.Footer>
      )}

      {mode === 'edit' && (
        <PageShell.Content>
          <form
            data-test-id="group-update-form"
            className="flex-1 flex flex-col min-h-0 overflow-auto"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <UpdateGroupFormFields
              form={form}
              isPending={isPending}
              mode={mode}
              slug={data.slug}
            />
          </form>
        </PageShell.Content>
      )}

      {mode === 'edit' && (
        <PageShell.Footer className="bg-sidebar">
          <FormFooter
            form={form}
            onCancel={() => {
              form.reset();
              setMode('show');
            }}
            submitTestId="group-update-submit-btn"
            cancelTestId="group-update-cancel-btn"
          />
        </PageShell.Footer>
      )}
    </>
  );
}
