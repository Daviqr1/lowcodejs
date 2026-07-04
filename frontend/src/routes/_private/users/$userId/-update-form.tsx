import { UserIcon } from 'lucide-react';

import { FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { withForm } from '@/integrations/tanstack-form/form-hook';
import { E_USER_STATUS } from '@/lib/constant';
import type { ValueOf } from '@/lib/interfaces';
import { UserUpdateFormSchema } from '@/lib/schemas';

export const UserUpdateSchema = UserUpdateFormSchema;
export type UserUpdateFormValues = {
  name: string;
  email: string;
  password: string;
  status: ValueOf<typeof E_USER_STATUS>;
  group: string;
  groups: Array<string>;
};

export const userUpdateFormDefaultValues: UserUpdateFormValues = {
  name: '',
  email: '',
  password: '',
  status: E_USER_STATUS.ACTIVE,
  group: '',
  groups: [],
};

export const UpdateUserFormFields = withForm({
  defaultValues: userUpdateFormDefaultValues,
  props: {
    isPending: false,
    // withForm infere o tipo do prop pelo default; a asserção define a união.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mode: 'show' as 'show' | 'edit',
    allowPasswordChange: false,
    onAllowPasswordChangeChange: () => {},
  },
  render: function Render({
    form,
    isPending,
    mode,
    allowPasswordChange,
    onAllowPasswordChangeChange,
  }) {
    const isDisabled = mode === 'show' || isPending;

    return (
      <section
        data-test-id="user-update-form-fields"
        className="space-y-4 p-2"
      >
        {/* Campo Nome */}
        <form.AppField name="name">
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
        <form.AppField name="email">
          {(field) => (
            <field.FieldEmail
              label="E-mail"
              placeholder="exemplo@email.com"
              disabled={isDisabled}
            />
          )}
        </form.AppField>

        {/* Switch Alterar Senha */}
        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <FieldLabel>Alterar senha</FieldLabel>
            <p className="text-sm text-muted-foreground">
              Ative esta opção para atualizar a senha do usuário
            </p>
          </div>
          <Switch
            data-test-id="user-change-password-switch"
            disabled={isDisabled}
            checked={allowPasswordChange}
            onCheckedChange={onAllowPasswordChangeChange}
          />
        </div>

        {/* Campo Senha (condicional) */}
        {allowPasswordChange && (
          <form.AppField
            name="password"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === '') {
                  return 'Senha é obrigatória';
                }
                if (value.length < 6) {
                  return 'Senha deve ter pelo menos 6 caracteres';
                }
                if (!/[A-Z]/.test(value)) {
                  return 'Senha deve conter pelo menos uma letra maiúscula';
                }
                if (!/[a-z]/.test(value)) {
                  return 'Senha deve conter pelo menos uma letra minúscula';
                }
                if (!/[0-9]/.test(value)) {
                  return 'Senha deve conter pelo menos um número';
                }
                if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
                  return 'Senha deve conter pelo menos um caractere especial';
                }
                return undefined;
              },
              onBlur: ({ value }) => {
                if (!value || value.trim() === '') {
                  return 'Senha é obrigatória';
                }
                if (value.length < 6) {
                  return 'Senha deve ter pelo menos 6 caracteres';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <field.FieldPassword
                label="Nova senha"
                placeholder="Digite a nova senha"
                disabled={isDisabled}
                required
              />
            )}
          </form.AppField>
        )}

        {/* Campo Status como Switch */}
        <form.AppField name="status">
          {(field) => (
            <field.FieldSwitch
              label="Status do usuário"
              description="Defina se o usuário está ativo ou inativo no sistema"
              disabled={isDisabled}
            />
          )}
        </form.AppField>

        {/* Campo Grupo principal */}
        <form.AppField name="group">
          {(field) => (
            <field.FieldGroupCombobox
              label="Grupo"
              placeholder="Selecione um grupo..."
              disabled={isDisabled}
              required
            />
          )}
        </form.AppField>

        {/* Campo Grupos adicionais (multi-grupo) */}
        <form.AppField name="groups">
          {(field) => (
            <field.FieldGroupMultiSelect
              label="Grupos adicionais (opcional)"
              placeholder="Selecione grupos adicionais..."
              disabled={isDisabled}
            />
          )}
        </form.AppField>
      </section>
    );
  },
});
