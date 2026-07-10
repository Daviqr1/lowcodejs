import { FileTextIcon } from 'lucide-react';
import React from 'react';
import { z } from 'zod';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGroupReadList } from '@/hooks/tanstack-query/use-group-read-list';
import { withForm } from '@/integrations/tanstack-form/form-hook';
import {
  E_FIELD_TYPE,
  E_PERMISSION_TARGET,
  E_TABLE_PROFILE,
  E_TABLE_STYLE,
  PERMISSION_DESCRIPTION_MAPPER,
  PERMISSION_LABEL_MAPPER,
  TABLE_NAME_REGEX,
  TABLE_PERMISSION_ACTIONS,
} from '@/lib/constant';
import type {
  IField,
  ILayoutFields,
  IPermissionBinding,
  ITable,
} from '@/lib/interfaces';
import {
  COLLABORATION_PRESET_LABEL,
  COLLABORATION_PRESET_OPTIONS,
  E_COLLABORATION_PRESET,
  applyCollaborationPreset,
  detectCollaborationPreset,
} from '@/lib/table-permission-presets';
import { getAllowedTableStyles } from '@/lib/table-style';

const PermissionBindingSchema = z.object({
  kind: z.enum([
    E_PERMISSION_TARGET.PUBLIC,
    E_PERMISSION_TARGET.NOBODY,
    E_PERMISSION_TARGET.GROUP,
  ]),
  group: z.string().nullable().default(null),
});

const TableMemberSchema = z.object({
  user: z.string(),
  profile: z.enum([
    E_TABLE_PROFILE.OWNER,
    E_TABLE_PROFILE.ADMIN,
    E_TABLE_PROFILE.EDITOR,
    E_TABLE_PROFILE.CONTRIBUTOR,
    E_TABLE_PROFILE.VIEWER,
  ]),
});

// Mapa default (tudo "Ninguém"): tabelas legadas sem permissions começam assim.
export function buildDefaultPermissions(): Record<string, IPermissionBinding> {
  const permissions: Record<string, IPermissionBinding> = {};
  for (const action of TABLE_PERMISSION_ACTIONS) {
    permissions[action] = { kind: E_PERMISSION_TARGET.NOBODY, group: null };
  }
  return permissions;
}

const LayoutFieldsSchema = z.object({
  title: z.string().default(''),
  description: z.string().default(''),
  cover: z.string().default(''),
  category: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  color: z.string().default(''),
  participants: z.string().default(''),
  reminder: z.string().default(''),
});

// Schema estendido com campos de UI (logoFile)
export const TableUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(40, 'Nome deve ter no máximo 40 caracteres'),
  slug: z.string().trim().default(''),
  description: z.string().default(''),
  style: z.enum([
    E_TABLE_STYLE.LIST,
    E_TABLE_STYLE.GALLERY,
    E_TABLE_STYLE.DOCUMENT,
    E_TABLE_STYLE.CARD,
    E_TABLE_STYLE.MOSAIC,
    E_TABLE_STYLE.KANBAN,
    E_TABLE_STYLE.FORUM,
    E_TABLE_STYLE.CALENDAR,
    E_TABLE_STYLE.GANTT,
  ]),
  logo: z.string().nullable().default(null),
  logoFile: z.array(z.custom<File>()).default([]),
  permissions: z.record(z.string(), PermissionBindingSchema).default({}),
  members: z.array(TableMemberSchema).default([]),
  owner: z.string().default(''),
  order: z.string().default('none'),
  rowSlugFieldId: z.string().nullable().default(null),
  layoutFields: LayoutFieldsSchema.default({
    title: '',
    description: '',
    cover: '',
    category: '',
    startDate: '',
    endDate: '',
    color: '',
    participants: '',
    reminder: '',
  }),
});

export type TableUpdateFormValues = z.infer<typeof TableUpdateSchema>;

export const tableUpdateFormDefaultValues: TableUpdateFormValues = {
  name: '',
  slug: '',
  description: '',
  style: E_TABLE_STYLE.LIST,
  logo: null,
  logoFile: [],
  permissions: buildDefaultPermissions(),
  members: [],
  owner: '',
  order: 'none',
  rowSlugFieldId: null,
  layoutFields: {
    title: '',
    description: '',
    cover: '',
    category: '',
    startDate: '',
    endDate: '',
    color: '',
    participants: '',
    reminder: '',
  },
};

export const UpdateTableFormFields = withForm({
  defaultValues: tableUpdateFormDefaultValues,
  props: {
    isPending: false,
    // withForm infere o tipo do prop pelo default; a asserção define o tipo.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mode: 'show' as 'show' | 'edit',
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    tableData: null as ITable | null,
  },
  render: function Render({ form, isPending, mode, tableData }) {
    const isDisabled = mode === 'show' || isPending;

    // Grupo Registered: alvo dos presets que liberam "usuário logado".
    const { data: groups } = useGroupReadList();
    const registeredGroupId = React.useMemo(() => {
      const match = (groups ?? []).find(
        (group) => group.slug?.toUpperCase() === 'REGISTERED',
      );
      return match?._id ?? null;
    }, [groups]);

    function applyPreset(value: string): void {
      const preset = COLLABORATION_PRESET_OPTIONS.find(
        (item) => item === value,
      );
      if (!preset) return;
      form.setFieldValue(
        'permissions',
        applyCollaborationPreset(preset, registeredGroupId),
      );
    }

    const orderOptions = React.useMemo(() => {
      const fields = tableData?.fields?.filter((f) => !f.trashed) ?? [];
      const options: Array<{ label: string; value: string }> = [
        { label: 'Nenhuma', value: 'none' },
      ];
      for (const f of fields) {
        options.push({
          label: `${f.name} (Ascendente)`,
          value: `${f.slug}:asc`,
        });
        options.push({
          label: `${f.name} (Descendente)`,
          value: `${f.slug}:desc`,
        });
      }
      return options;
    }, [tableData]);

    const activeFields = React.useMemo(
      () => tableData?.fields?.filter((f: IField) => !f.trashed) ?? [],
      [tableData],
    );

    const fieldOptionsByType = React.useCallback(
      (type: string) =>
        activeFields
          .filter((f: IField) => f.type === type)
          .map((f: IField) => ({ label: f.name, value: f._id })),
      [activeFields],
    );

    const LAYOUT_ROLE_CONFIG: Record<
      string,
      Array<{
        role: keyof ILayoutFields;
        label: string;
        type: string;
      }>
    > = {
      [E_TABLE_STYLE.CARD]: [
        { role: 'title', label: 'Título', type: E_FIELD_TYPE.TEXT_SHORT },
        {
          role: 'description',
          label: 'Descrição',
          type: E_FIELD_TYPE.TEXT_LONG,
        },
        { role: 'cover', label: 'Capa (imagem)', type: E_FIELD_TYPE.FILE },
      ],
      [E_TABLE_STYLE.MOSAIC]: [
        { role: 'title', label: 'Título', type: E_FIELD_TYPE.TEXT_SHORT },
        {
          role: 'description',
          label: 'Descrição',
          type: E_FIELD_TYPE.TEXT_LONG,
        },
        { role: 'cover', label: 'Capa (imagem)', type: E_FIELD_TYPE.FILE },
      ],
      [E_TABLE_STYLE.GALLERY]: [
        { role: 'title', label: 'Título', type: E_FIELD_TYPE.TEXT_SHORT },
        {
          role: 'description',
          label: 'Descrição',
          type: E_FIELD_TYPE.TEXT_LONG,
        },
        { role: 'cover', label: 'Capa (imagem)', type: E_FIELD_TYPE.FILE },
      ],
      [E_TABLE_STYLE.DOCUMENT]: [
        { role: 'title', label: 'Título', type: E_FIELD_TYPE.TEXT_SHORT },
        {
          role: 'description',
          label: 'Descrição',
          type: E_FIELD_TYPE.TEXT_LONG,
        },
        { role: 'category', label: 'Categoria', type: E_FIELD_TYPE.CATEGORY },
      ],
      [E_TABLE_STYLE.CALENDAR]: [
        { role: 'title', label: 'Título', type: E_FIELD_TYPE.TEXT_SHORT },
        {
          role: 'description',
          label: 'Descrição',
          type: E_FIELD_TYPE.TEXT_LONG,
        },
        { role: 'startDate', label: 'Data de início', type: E_FIELD_TYPE.DATE },
        { role: 'endDate', label: 'Data de término', type: E_FIELD_TYPE.DATE },
        { role: 'color', label: 'Cor', type: E_FIELD_TYPE.DROPDOWN },
        {
          role: 'participants',
          label: 'Participantes',
          type: E_FIELD_TYPE.USER,
        },
        {
          role: 'reminder',
          label: 'Lembrete',
          type: E_FIELD_TYPE.FIELD_GROUP,
        },
      ],
    };

    return (
      <section
        data-test-id="table-update-form-fields"
        className="space-y-4 p-3 sm:p-2"
      >
        {/* Campo Logo */}
        <form.AppField name="logoFile">
          {(field) => (
            <field.FieldFileUpload
              label="Logo"
              accept="image/*"
              maxFiles={1}
              maxSize={4 * 1024 * 1024}
              placeholder="Arraste e solte a imagem do logo"
              shouldDeleteFromStorage
              onStorageChange={(storages) => {
                if (storages[0]?._id) {
                  form.setFieldValue('logo', storages[0]._id);
                }
              }}
              showPreview={mode === 'show'}
              previewUrl={tableData?.logo?.url}
              previewAlt={tableData?.logo?.filename}
            />
          )}
        </form.AppField>

        {/* Campo Nome */}
        <form.AppField
          name="name"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim() === '') {
                return 'Nome é obrigatório';
              }
              if (value.length > 40) {
                return 'Nome deve ter no máximo 40 caracteres';
              }
              if (!TABLE_NAME_REGEX.test(value)) {
                return {
                  message: 'O nome não pode conter caracteres especiais',
                };
              }
              return undefined;
            },
            onBlur: ({ value }) => {
              if (!value || value.trim() === '') {
                return 'Nome é obrigatório';
              }
              if (value.length > 40) {
                return 'Nome deve ter no máximo 40 caracteres';
              }
              if (!TABLE_NAME_REGEX.test(value)) {
                return {
                  message: 'O nome não pode conter caracteres especiais',
                };
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <field.FieldText
              label="Nome"
              placeholder="Digite o nome da tabela"
              disabled={isDisabled}
              icon={<FileTextIcon />}
              required
            />
          )}
        </form.AppField>

        {/* Campo URL */}
        <form.AppField name="slug">
          {(field) => (
            <field.FieldText
              label="URL"
              placeholder="ex: minha-tabela"
              description="Use letras minúsculas e hífens. Ex: minha-tabela"
              disabled={isDisabled}
            />
          )}
        </form.AppField>

        {/* Campo Descrição */}
        <form.AppField name="description">
          {(field) => (
            <field.FieldTextarea
              label="Descrição"
              placeholder="Digite uma descrição para a tabela"
              disabled={isDisabled}
              rows={3}
            />
          )}
        </form.AppField>

        {/* Campo Style */}
        <form.AppField name="style">
          {(field) => (
            <field.TableStyleSelectField
              label="Layout de visualização"
              placeholder="Selecione o estilo de visualização"
              disabled={isDisabled}
              allowedStyles={getAllowedTableStyles(tableData)}
            />
          )}
        </form.AppField>

        {/* Campos do Layout */}
        <form.Subscribe selector={(state) => state.values.style}>
          {(currentStyle) => {
            const layoutRoles = LAYOUT_ROLE_CONFIG[currentStyle] ?? [];
            if (layoutRoles.length === 0) return null;
            return (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Campos do Layout
                </p>
                {layoutRoles.map((item) => (
                  <form.AppField
                    key={item.role}
                    name={`layoutFields.${item.role}`}
                  >
                    {(field) => (
                      <field.TableLayoutFieldSelect
                        label={item.label}
                        disabled={isDisabled}
                        options={fieldOptionsByType(item.type)}
                      />
                    )}
                  </form.AppField>
                ))}
              </div>
            );
          }}
        </form.Subscribe>

        {/* Permissões por ação (Grupo | Público | Ninguém) */}
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium text-muted-foreground">
            Permissões da tabela
          </p>
          <p className="text-xs text-muted-foreground">
            Liberar uma ação para um grupo só tem efeito se o grupo também tiver
            a permissão correspondente (regra de interseção). "Todos (Público)"
            libera para qualquer pessoa; "Ninguém" bloqueia.
          </p>

          {/* Preset de colaboração: preenche os 10 bindings de uma vez. */}
          <form.Subscribe selector={(state) => state.values.permissions}>
            {(permissions) => (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  Modelo de colaboração
                </p>
                <Select
                  value={detectCollaborationPreset(
                    permissions,
                    registeredGroupId,
                  )}
                  onValueChange={applyPreset}
                  disabled={isDisabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Personalizado" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLABORATION_PRESET_OPTIONS.map((preset) => (
                      <SelectItem
                        key={preset}
                        value={preset}
                      >
                        {COLLABORATION_PRESET_LABEL[preset]}
                      </SelectItem>
                    ))}
                    <SelectItem
                      value={E_COLLABORATION_PRESET.CUSTOM}
                      disabled
                    >
                      {
                        COLLABORATION_PRESET_LABEL[
                          E_COLLABORATION_PRESET.CUSTOM
                        ]
                      }
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Subscribe>

          {TABLE_PERMISSION_ACTIONS.map((action) => (
            <form.AppField
              key={action}
              name={`permissions.${action}`}
            >
              {(field) => (
                <field.FieldPermissionBinding
                  label={PERMISSION_LABEL_MAPPER[action] ?? action}
                  description={PERMISSION_DESCRIPTION_MAPPER[action]}
                  disabled={isDisabled}
                />
              )}
            </form.AppField>
          ))}
        </div>

        {/* Dono da tabela (troca de dono) */}
        <form.AppField name="owner">
          {(field) => (
            <field.FieldOwnerSelect
              label="Dono"
              disabled={isDisabled}
            />
          )}
        </form.AppField>

        {/* Convidados (perfis de colaboração) */}
        <form.AppField name="members">
          {(field) => (
            <field.FieldTableMembers
              label="Convidados"
              disabled={isDisabled}
            />
          )}
        </form.AppField>

        {/* Ordenação padrão */}
        <form.AppField name="order">
          {(field) => (
            <field.TableOrderSelectField
              label="Ordenação padrão"
              description="Define a ordenação padrão dos registros na listagem"
              placeholder="Selecione uma ordenação"
              disabled={isDisabled}
              options={orderOptions}
            />
          )}
        </form.AppField>

        {/* Campo para gerar slug da URL de registro */}
        <form.AppField name="rowSlugFieldId">
          {(field) => {
            const textShortFields = activeFields.filter(
              (f: IField) => f.type === E_FIELD_TYPE.TEXT_SHORT,
            );
            return (
              <field.TableLayoutFieldSelect
                label="Campo para slug da URL de registro"
                placeholder="Nenhum"
                emptyLabel="Nenhum"
                disabled={isDisabled || textShortFields.length === 0}
                options={textShortFields.map((f: IField) => ({
                  label: f.name,
                  value: f._id,
                }))}
              />
            );
          }}
        </form.AppField>
      </section>
    );
  },
});
