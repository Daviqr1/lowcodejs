import { UsersIcon } from 'lucide-react';

import { withForm } from '@/integrations/tanstack-form/form-hook';
import type { UserGroupCreatePayload } from '@/lib/payloads';
import { UserGroupCreateBodySchema } from '@/lib/schemas';

export const GroupCreateSchema = UserGroupCreateBodySchema;
export type GroupFormType = UserGroupCreatePayload;

export const groupFormDefaultValues: GroupFormType = {
  name: '',
  description: '',
  permissions: [],
  encompasses: [],
};

export const CreateGroupFormFields = withForm({
  defaultValues: groupFormDefaultValues,
  props: {
    isPending: false,
  },
  render: function Render({ form, isPending }) {
    return (
      <section
        data-test-id="group-create-form-fields"
        className="space-y-4 p-3 sm:p-2"
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
              placeholder="Digite o nome do grupo"
              disabled={isPending}
              icon={<UsersIcon />}
            />
          )}
        </form.AppField>

        {/* Campo Descrição */}
        <form.AppField name="description">
          {(field) => (
            <field.FieldTextarea
              label="Descrição (opcional)"
              placeholder="Descrição do grupo (opcional)"
              disabled={isPending}
              rows={3}
            />
          )}
        </form.AppField>

        {/* Campo Permissões */}
        <form.AppField
          name="permissions"
          validators={{
            onChange: ({ value }) => {
              if (value.length === 0) {
                return 'Selecione ao menos uma permissão';
              }
              return undefined;
            },
            onBlur: ({ value }) => {
              if (value.length === 0) {
                return 'Selecione ao menos uma permissão';
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <field.FieldPermissionMultiSelect
              label="Permissões"
              placeholder="Selecione as permissões..."
              disabled={isPending}
              required
            />
          )}
        </form.AppField>

        {/* Campo Grupos englobados (hierarquia) */}
        <form.AppField name="encompasses">
          {(field) => (
            <field.FieldGroupMultiSelect
              label="Grupos englobados"
              placeholder="Selecione grupos que este engloba..."
              disabled={isPending}
            />
          )}
        </form.AppField>
      </section>
    );
  },
});
