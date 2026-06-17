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

import type { UserUpdateFormValues } from './-update-form';
import { UpdateUserFormFields, UserUpdateSchema } from './-update-form';
import { UserView } from './-view';

import { FormFooter } from '@/components/common/form-footer';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { userDetailOptions } from '@/hooks/tanstack-query/_query-options';
import { useUpdateUser } from '@/hooks/tanstack-query/use-user-update';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';
import type { IUser } from '@/lib/interfaces';

export const Route = createLazyFileRoute('/_private/users/$userId/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const { userId } = useParams({
    from: '/_private/users/$userId/',
  });

  const sidebar = useSidebar();
  const router = useRouter();

  const { data } = useSuspenseQuery(userDetailOptions(userId));

  const search = useSearch({ from: '/_private/users/$userId/' });
  const [mode, setMode] = React.useState<'show' | 'edit'>(
    search.mode === 'edit' ? 'edit' : 'show',
  );

  const goBack = (): void => {
    sidebar.setOpen(true);
    router.navigate({
      to: '/users',
      replace: true,
      search: { page: 1, perPage: 50 },
    });
  };

  return (
    <PageShell data-test-id="user-detail-page">
      <PageShell.Header borderBottom={false}>
        <PageHeader
          onBack={goBack}
          title="Detalhes do usuário"
        >
          {mode === 'show' && (
            <Button
              data-test-id="user-edit-btn"
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

      <UserUpdateContent
        data={data}
        mode={mode}
        setMode={setMode}
      />
    </PageShell>
  );
}

interface UserUpdateContentProps {
  data: IUser;
  mode: 'show' | 'edit';
  setMode: React.Dispatch<React.SetStateAction<'show' | 'edit'>>;
}

function UserUpdateContent({
  data,
  mode,
  setMode,
}: UserUpdateContentProps): React.JSX.Element {
  const sidebar = useSidebar();
  const router = useRouter();

  const [allowPasswordChange, setAllowPasswordChange] = React.useState(false);

  const goBack = (): void => {
    sidebar.setOpen(true);
    router.navigate({
      to: '/users',
      replace: true,
      search: { page: 1, perPage: 50 },
    });
  };

  const form = useAppForm({
    defaultValues: {
      name: data.name,
      email: data.email,
      password: '',
      status: data.status,
      group: data.group._id,
    } satisfies UserUpdateFormValues,
    validators: {
      onChange: UserUpdateSchema,
      onSubmit: UserUpdateSchema,
    },
    onSubmit: async ({ value }) => {
      if (_update.status === 'pending') return;

      const { password, ...rest } = value;
      await _update.mutateAsync({
        ...rest,
        _id: data._id,
        ...(allowPasswordChange && password !== '' && { password }),
      });
    },
  });

  useApiErrorAutoClear(form);

  const _update = useUpdateUser({
    onSuccess() {
      toast.success('Usuário atualizado', {
        description: 'Os dados do usuário foram atualizados com sucesso',
      });

      form.reset();
      setMode('show');
      setAllowPasswordChange(false);
      router.invalidate();
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao atualizar o usuário',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
      });
    },
  });

  const isPending = _update.status === 'pending';

  return (
    <>
      {mode === 'show' && (
        <PageShell.Content>
          <UserView data={data} />
        </PageShell.Content>
      )}

      {mode === 'show' && (
        <PageShell.Footer className="bg-sidebar">
          <div className="flex justify-start gap-2">
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
            data-test-id="user-update-form"
            className="flex-1 flex flex-col min-h-0 overflow-auto"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <UpdateUserFormFields
              form={form}
              isPending={isPending}
              mode={mode}
              allowPasswordChange={allowPasswordChange}
              onAllowPasswordChangeChange={setAllowPasswordChange}
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
              setAllowPasswordChange(false);
            }}
            submitTestId="user-update-submit-btn"
            cancelTestId="user-update-cancel-btn"
          />
        </PageShell.Footer>
      )}
    </>
  );
}
