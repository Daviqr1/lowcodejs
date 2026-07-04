import { UserIcon } from 'lucide-react';
import { z } from 'zod';

import { FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { withForm } from '@/integrations/tanstack-form/form-hook';
import type { IGroup } from '@/lib/interfaces';

// Schema com campos de UI (confirmPassword é apenas validação no frontend)
export const ProfileUpdateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.email('Digite um e-mail válido').min(1, 'E-mail é obrigatório'),
  currentPassword: z.string(),
  newPassword: z.string(),
  confirmPassword: z.string(),
  notificationsEnabled: z.boolean(),
});

export type ProfileUpdateFormValues = {
  name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  notificationsEnabled: boolean;
};

export const profileUpdateFormDefaultValues: ProfileUpdateFormValues = {
  name: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  notificationsEnabled: true,
};

export const UpdateProfileFormFields = withForm({
  defaultValues: profileUpdateFormDefaultValues,
  props: {
    isPending: false,
    // withForm infere o tipo do prop pelo default; a asserção define o tipo.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mode: 'show' as 'show' | 'edit',
    allowPasswordChange: false,
    onAllowPasswordChangeChange: () => {},
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    groupData: null as IGroup | null,
  },
  render: function Render({
    form,
    isPending,
    mode,
    allowPasswordChange,
    onAllowPasswordChangeChange,
    groupData,
  }) {
    const isDisabled = mode === 'show' || isPending;

    return (
      <section
        data-test-id="profile-update-form-fields"
        className="space-y-4 p-2"
      >
        {/* Campo Nome */}
        <form.AppField
          name="name"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim() === '') {
                return 'Nome é obrigatório';
              }
              return undefined;
            },
            onBlur: ({ value }) => {
              if (!value || value.trim() === '') {
                return 'Nome é obrigatório';
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <field.FieldText
              label="Nome"
              placeholder="Digite o nome completo"
              disabled={isDisabled}
              icon={<UserIcon />}
            />
          )}
        </form.AppField>

        {/* Campo Email */}
        <form.AppField
          name="email"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim() === '') {
                return 'E-mail é obrigatório';
              }
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(value)) {
                return 'Digite um e-mail válido';
              }
              return undefined;
            },
            onBlur: ({ value }) => {
              if (!value || value.trim() === '') {
                return 'E-mail é obrigatório';
              }
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(value)) {
                return 'Digite um e-mail válido';
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <field.FieldEmail
              label="E-mail"
              placeholder="exemplo@email.com"
              disabled={isDisabled}
            />
          )}
        </form.AppField>

        {/* Grupo (read-only card) */}
        {groupData && (
          <div className="space-y-2">
            <FieldLabel>Grupo</FieldLabel>
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="space-y-2">
                <p className="font-medium">{groupData.name}</p>
                <p className="text-sm text-muted-foreground">
                  {groupData.description || 'Sem descrição disponível'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Switch Visual Notifications */}
        <form.AppField name="notificationsEnabled">
          {(field) => (
            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FieldLabel>Notificações visuais</FieldLabel>
                <p className="text-sm text-muted-foreground">
                  Mostra um toast quando você recebe uma notificação em outra
                  página. Desativando, as notificações continuam acumulando no
                  sininho mas sem alerta na tela.
                </p>
              </div>
              <Switch
                disabled={isDisabled}
                checked={field.state.value}
                onCheckedChange={(value) => field.handleChange(value)}
                data-test-id="profile-notifications-enabled-switch"
              />
            </div>
          )}
        </form.AppField>

        {/* Switch Change Password */}
        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <FieldLabel>Alterar senha</FieldLabel>
            <p className="text-sm text-muted-foreground">
              Ative esta opção para atualizar sua senha
            </p>
          </div>
          <Switch
            disabled={isDisabled}
            checked={allowPasswordChange}
            onCheckedChange={onAllowPasswordChangeChange}
            data-test-id="profile-change-password-switch"
          />
        </div>

        {/* Campos de senha (condicionais) */}
        {allowPasswordChange && (
          <>
            {/* Current Password */}
            <form.AppField
              name="currentPassword"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.trim() === '') {
                    return 'Senha atual é obrigatória';
                  }
                  return undefined;
                },
                onBlur: ({ value }) => {
                  if (!value || value.trim() === '') {
                    return 'Senha atual é obrigatória';
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <field.FieldPassword
                  label="Senha atual"
                  placeholder="Digite sua senha atual"
                  disabled={isDisabled}
                  required
                />
              )}
            </form.AppField>

            {/* New Password */}
            <form.AppField
              name="newPassword"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.trim() === '') {
                    return 'Nova senha é obrigatória';
                  }

                  if (value.length < 8) {
                    return {
                      message: 'Senha deve ter pelo menos 8 caracteres',
                    };
                  }

                  if (!/[A-Z]/.test(value)) {
                    return {
                      message:
                        'Senha deve conter pelo menos uma letra maiúscula',
                    };
                  }

                  if (!/[a-z]/.test(value)) {
                    return {
                      message:
                        'Senha deve conter pelo menos uma letra minúscula',
                    };
                  }

                  if (!/[0-9]/.test(value)) {
                    return {
                      message: 'Senha deve conter pelo menos um número',
                    };
                  }

                  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
                    return {
                      message:
                        'Senha deve conter pelo menos um caractere especial',
                    };
                  }

                  return undefined;
                },
                onBlur: ({ value }) => {
                  if (!value || value.trim() === '') {
                    return 'Nova senha é obrigatória';
                  }

                  if (value.length < 8) {
                    return {
                      message: 'Senha deve ter pelo menos 8 caracteres',
                    };
                  }

                  if (!/[A-Z]/.test(value)) {
                    return {
                      message:
                        'Senha deve conter pelo menos uma letra maiúscula',
                    };
                  }

                  if (!/[a-z]/.test(value)) {
                    return {
                      message:
                        'Senha deve conter pelo menos uma letra minúscula',
                    };
                  }

                  if (!/[0-9]/.test(value)) {
                    return {
                      message: 'Senha deve conter pelo menos um número',
                    };
                  }

                  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
                    return {
                      message:
                        'Senha deve conter pelo menos um caractere especial',
                    };
                  }

                  return undefined;
                },
              }}
            >
              {(field) => (
                <field.FieldPassword
                  label="Nova senha"
                  placeholder="Digite sua nova senha"
                  disabled={isDisabled}
                  required
                />
              )}
            </form.AppField>

            {/* Confirm Password */}
            <form.AppField
              name="confirmPassword"
              validators={{
                onChange: ({ value, fieldApi }) => {
                  if (!value || value.trim() === '') {
                    return 'Confirmação de senha é obrigatória';
                  }

                  const newPassword =
                    fieldApi.form.getFieldValue('newPassword');
                  if (value !== newPassword) {
                    return 'As senhas não coincidem';
                  }

                  return undefined;
                },
                onBlur: ({ value, fieldApi }) => {
                  if (!value || value.trim() === '') {
                    return 'Confirmação de senha é obrigatória';
                  }

                  const newPassword =
                    fieldApi.form.getFieldValue('newPassword');
                  if (value !== newPassword) {
                    return 'As senhas não coincidem';
                  }

                  return undefined;
                },
              }}
            >
              {(field) => (
                <field.FieldPassword
                  label="Confirmar nova senha"
                  placeholder="Confirme sua nova senha"
                  disabled={isDisabled}
                  required
                />
              )}
            </form.AppField>
          </>
        )}
      </section>
    );
  },
});
