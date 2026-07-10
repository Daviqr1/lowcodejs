import { useStore } from '@tanstack/react-store';
import { FileTextIcon } from 'lucide-react';

import { SeparatorInfo } from '../-separator-info';

import { FileUploadWithStorage } from '@/components/common/file-upload/file-upload-with-storage';
import { ExtensionModuleSelect } from '@/components/common/selectors/extension-module-select';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { withForm } from '@/integrations/tanstack-form/form-hook';
import { E_MENU_ITEM_TYPE, E_PERMISSION_TARGET } from '@/lib/constant';
import type {
  IPermissionBinding,
  IStorage,
  Merge,
  ValueOf,
} from '@/lib/interfaces';
import type { MenuCreatePayload } from '@/lib/payloads';
import { MenuCreateBodySchema } from '@/lib/schemas';

export const MenuCreateSchema = MenuCreateBodySchema;
export type MenuFormType = Merge<
  Omit<MenuCreatePayload, 'order' | 'visibility'>,
  {
    position: string;
    iconFile: Array<File>;
    visibility: IPermissionBinding;
  }
>;

export const menuFormDefaultValues: MenuFormType = {
  name: '',
  type: E_MENU_ITEM_TYPE.SEPARATOR,
  table: '',
  html: '',
  url: '',
  icon: null,
  parent: '',
  position: '0',
  isInitial: false,
  extension: null,
  iconFile: [],
  visibility: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
};

export const CreateMenuFormFields = withForm({
  defaultValues: menuFormDefaultValues,
  props: {
    isPending: false,
    // withForm infere o tipo do prop pelo default; a asserção define a união.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    menuType: E_MENU_ITEM_TYPE.SEPARATOR as
      | ValueOf<typeof E_MENU_ITEM_TYPE>
      | '',
  },
  render: function Render({ form, isPending, menuType }) {
    const parent = useStore(form.store, (state) => state.values.parent);
    const iconUrl = useStore(form.store, (state) => state.values.icon);

    return (
      <section
        data-test-id="menu-create-form-fields"
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
              placeholder="Digite o nome do menu"
              disabled={isPending}
              icon={<FileTextIcon />}
            />
          )}
        </form.AppField>

        {/* Campo Ícone (opcional) */}
        <form.Field
          name="iconFile"
          children={(field) => (
            <Field>
              <FieldLabel>Ícone</FieldLabel>
              <FieldDescription>
                Imagem opcional usada como ícone no menu lateral. Se vazio, é
                exibido o ícone padrão do tipo selecionado.
              </FieldDescription>
              <FileUploadWithStorage
                value={field.state.value}
                onValueChange={field.handleChange}
                onStorageChange={(storages: Array<IStorage>) => {
                  form.setFieldValue('icon', storages[0]?.url ?? null);
                }}
                accept="image/*"
                maxFiles={1}
                maxSize={4 * 1024 * 1024}
                placeholder="Arraste ou selecione uma imagem"
                shouldDeleteFromStorage={false}
              />
              {iconUrl && (
                <div className="mt-2 flex items-center gap-2 p-2 border rounded-md w-fit">
                  <img
                    src={iconUrl}
                    alt="Pré-visualização do ícone"
                    className="h-8 w-8 object-contain"
                  />
                  <span className="text-xs text-muted-foreground">
                    Ícone atual
                  </span>
                </div>
              )}
            </Field>
          )}
        />

        {/* Campo Tipo */}
        <form.AppField
          name="type"
          validators={{
            onChange: ({ value }) => {
              if (value.trim() === '') {
                return 'Tipo é obrigatório';
              }
              return undefined;
            },
            onBlur: ({ value }) => {
              if (value.trim() === '') {
                return 'Tipo é obrigatório';
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <field.FieldMenuTypeSelect
              label="Tipo"
              placeholder="Selecione o tipo de menu"
              disabled={isPending}
              required
            />
          )}
        </form.AppField>

        {/* Campo Parent */}
        <form.AppField name="parent">
          {(field) => (
            <field.FieldMenuCombobox
              label="Menu Pai"
              placeholder="Nenhum (raiz)"
              disabled={isPending}
            />
          )}
        </form.AppField>

        <form.AppField
          name="position"
          validators={{
            onChange: ({ value }) => {
              if (!value) return 'Posição é obrigatória';
              return undefined;
            },
            onBlur: ({ value }) => {
              if (!value) return 'Posição é obrigatória';
              return undefined;
            },
          }}
        >
          {(field) => (
            <field.FieldMenuPositionSelect
              label="Inserir após"
              parentId={parent || undefined}
              disabled={isPending}
              required
            />
          )}
        </form.AppField>

        {menuType !== E_MENU_ITEM_TYPE.SEPARATOR && (
          <form.AppField name="isInitial">
            {(field) => (
              <field.FieldBooleanSwitch
                label="Página inicial"
                description="Carregar este menu ao acessar o sistema"
                disabled={isPending}
              />
            )}
          </form.AppField>
        )}

        {/* Visibilidade da opção de menu (Grupo | Público | Ninguém) */}
        <form.AppField name="visibility">
          {(field) => (
            <field.FieldPermissionBinding
              label="Visibilidade"
              disabled={isPending}
            />
          )}
        </form.AppField>

        {/* Campo Tabela - Condicional para tipos TABLE e FORM */}
        {(menuType === E_MENU_ITEM_TYPE.TABLE ||
          menuType === E_MENU_ITEM_TYPE.FORM) && (
          <form.AppField
            name="table"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === '') {
                  return 'Tabela é obrigatória';
                }
                return undefined;
              },
              onBlur: ({ value }) => {
                if (!value || value.trim() === '') {
                  return 'Tabela é obrigatória';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <field.TableComboboxField
                label="Tabela"
                placeholder="Selecione uma tabela..."
                disabled={isPending}
                required
              />
            )}
          </form.AppField>
        )}

        {/* Campo HTML - Condicional para tipo PAGE */}
        {menuType === E_MENU_ITEM_TYPE.PAGE && (
          <form.AppField
            name="html"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === '' || value === '<p></p>') {
                  return 'O conteúdo da página é obrigatório';
                }
                return undefined;
              },
            }}
          >
            {(field) => <field.FieldEditor label="Conteúdo da Página" />}
          </form.AppField>
        )}

        {/* Campo URL - Condicional para tipo EXTERNAL */}
        {menuType === E_MENU_ITEM_TYPE.EXTERNAL && (
          <form.AppField
            name="url"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === '') {
                  return 'URL é obrigatória';
                }
                try {
                  new URL(value);
                } catch {
                  return 'URL inválida';
                }
                return undefined;
              },
              onBlur: ({ value }) => {
                if (!value || value.trim() === '') {
                  return 'URL é obrigatória';
                }
                try {
                  new URL(value);
                } catch {
                  return 'URL inválida';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <field.FieldUrl
                label="URL"
                placeholder="https://exemplo.com"
                disabled={isPending}
                required
              />
            )}
          </form.AppField>
        )}

        {/* Info para tipo SEPARATOR */}
        {menuType === E_MENU_ITEM_TYPE.SEPARATOR && <SeparatorInfo />}

        {/* Campo Extensão - Condicional para tipo EXTENSION_MODULE */}
        {menuType === E_MENU_ITEM_TYPE.EXTENSION_MODULE && (
          <form.Field
            name="extension"
            validators={{
              onChange: ({ value }) => {
                if (!value?.pkg || !value?.extensionId) {
                  return 'Selecione um módulo de extensão';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <ExtensionModuleSelect
                label="Módulo"
                value={field.state.value ?? null}
                onValueChange={(value) => field.handleChange(value)}
                disabled={isPending}
                required
                error={
                  (field.state.meta.isTouched &&
                    !field.state.meta.isValid &&
                    (field.state.meta.errors[0] ?? null)) ||
                  null
                }
              />
            )}
          </form.Field>
        )}
      </section>
    );
  },
});
