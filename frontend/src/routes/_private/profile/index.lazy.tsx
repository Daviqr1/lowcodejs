import { useSuspenseQuery } from '@tanstack/react-query';
import { createLazyFileRoute, useRouter } from '@tanstack/react-router';
import { PencilIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import type { ProfileUpdateFormValues } from './-update-form';
import { ProfileUpdateSchema, UpdateProfileFormFields } from './-update-form';
import { ProfileView } from './-view';

import { FormFooter } from '@/components/common/form-footer';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { Button } from '@/components/ui/button';
import { profileDetailOptions } from '@/hooks/tanstack-query/_query-options';
import { useUpdateProfile } from '@/hooks/tanstack-query/use-profile-update';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';
import type { IUser } from '@/lib/interfaces';

export const Route = createLazyFileRoute('/_private/profile/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const { data } = useSuspenseQuery(profileDetailOptions());

  const [mode, setMode] = React.useState<'show' | 'edit'>('show');

  return (
    <PageShell data-test-id="profile-page">
      {/* Header */}
      <PageShell.Header borderBottom={false}>
        <PageHeader title="Perfil do usuário">
          {mode === 'show' && (
            <Button
              type="button"
              className="px-2 cursor-pointer max-w-40 w-full"
              size="sm"
              onClick={() => setMode('edit')}
              data-test-id="profile-edit-btn"
            >
              <PencilIcon className="size-4 mr-1" />
              <span>Editar</span>
            </Button>
          )}
        </PageHeader>
      </PageShell.Header>

      {/* Content */}
      <PageShell.Content className="overflow-hidden">
        <ProfileUpdateContent
          data={data}
          mode={mode}
          setMode={setMode}
        />
      </PageShell.Content>
    </PageShell>
  );
}

type ProfileUpdateContentProps = {
  data: IUser;
  mode: 'show' | 'edit';
  setMode: React.Dispatch<React.SetStateAction<'show' | 'edit'>>;
};

function ProfileUpdateContent({
  data,
  mode,
  setMode,
}: ProfileUpdateContentProps): React.JSX.Element {
  const router = useRouter();

  const goBack = (): void => {
    router.navigate({
      to: '/',
      replace: true,
    });
  };

  const [allowPasswordChange, setAllowPasswordChange] = React.useState(false);

  const _update = useUpdateProfile({
    onSuccess() {
      toast.success('Perfil atualizado', {
        description: 'Os dados do perfil foram atualizados com sucesso',
      });

      form.reset();
      setMode('show');
      setAllowPasswordChange(false);
      router.invalidate();
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao atualizar o perfil',
        onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
      });
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: data.name,
      email: data.email,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      notificationsEnabled: data.notificationsEnabled ?? true,
    } satisfies ProfileUpdateFormValues,
    validators: {
      onChange: ProfileUpdateSchema,
      onSubmit: ProfileUpdateSchema,
    },
    onSubmit: async ({ value }) => {
      if (_update.status === 'pending') return;

      if (allowPasswordChange && value.newPassword !== value.confirmPassword) {
        toast.error('As senhas não coincidem', {
          description: 'A nova senha e a confirmação devem ser iguais',
        });
        return;
      }

      const payload: {
        name: string;
        email: string;
        allowPasswordChange: boolean;
        currentPassword?: string;
        newPassword?: string;
        notificationsEnabled?: boolean;
      } = {
        name: value.name.trim(),
        email: value.email.trim(),
        allowPasswordChange,
        notificationsEnabled: value.notificationsEnabled,
      };

      if (allowPasswordChange) {
        payload.currentPassword = value.currentPassword.trim();
        payload.newPassword = value.newPassword.trim();
      }

      await _update.mutateAsync(payload);
    },
  });

  useApiErrorAutoClear(form);

  const isPending = _update.status === 'pending';

  return (
    <>
      {mode === 'show' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-auto">
          <ProfileView data={data} />
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
          data-test-id="profile-update-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <UpdateProfileFormFields
            form={form}
            isPending={isPending}
            mode={mode}
            allowPasswordChange={allowPasswordChange}
            onAllowPasswordChangeChange={setAllowPasswordChange}
            groupData={data.group}
          />
        </form>
      )}

      {/* Footer */}
      {mode === 'edit' && (
        <PageShell.Footer className="bg-sidebar">
          <FormFooter
            form={form}
            cancelTestId="profile-update-cancel-btn"
            submitTestId="profile-update-submit-btn"
            onCancel={() => {
              form.reset();
              setMode('show');
              setAllowPasswordChange(false);
            }}
          />
        </PageShell.Footer>
      )}
    </>
  );
}
