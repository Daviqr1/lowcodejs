import { UserIcon } from 'lucide-react';

import { withForm } from '@/integrations/tanstack-form/form-hook';
import type { UserCreatePayload } from '@/lib/payloads';
import { UserCreateBodySchema } from '@/lib/schemas';

export const UserCreateSchema = UserCreateBodySchema;
export type UserFormType = UserCreatePayload;

export const userFormDefaultValues: UserFormType = {
  name: '',
  email: '',
  password: '',
  group: '',
  groups: [],
};

export const CreateUserFormFields = withForm({
  defaultValues: userFormDefaultValues,
  props: {
    isPending: false,
  },
  render: function Render({ form, isPending }) {
    return (
      <section
        data-test-id="user-create-form-fields"
        className="space-y-4 p-3 sm:p-2"
      >
        {/* Campo Nome */}
        <form.AppField name="name">
          {(field) => (
            <field.FieldText
              label="Nome"
              placeholder="Digite o nome completo"
              disabled={isPending}
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
              disabled={isPending}
            />
          )}
        </form.AppField>

        {/* Campo Senha */}
        <form.AppField name="password">
          {(field) => (
            <field.FieldPassword
              label="Senha"
              placeholder="Digite a senha"
              disabled={isPending}
            />
          )}
        </form.AppField>

        {/* Campo Grupo principal */}
        <form.AppField name="group">
          {(field) => (
            <field.FieldGroupCombobox
              label="Grupo"
              placeholder="Selecione um grupo..."
              disabled={isPending}
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
              disabled={isPending}
            />
          )}
        </form.AppField>
      </section>
    );
  },
});
