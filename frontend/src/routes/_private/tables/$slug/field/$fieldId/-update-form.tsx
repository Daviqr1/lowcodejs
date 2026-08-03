import { useStore } from '@tanstack/react-form';
import { FileTextIcon } from 'lucide-react';
import { useEffect } from 'react';
import z from 'zod';

import { TableFieldRelationshipCardinality } from '@/components/common/dynamic-table/table-config/table-field-relationship-cardinality';
import { TableFieldRelationshipLabelComposer } from '@/components/common/dynamic-table/table-config/table-field-relationship-label-composer';
import { ExtensionSlot } from '@/components/common/extension-slot';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { withForm } from '@/integrations/tanstack-form/form-hook';
import {
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_PERMISSION_TARGET,
  NATIVE_FIELD_LABEL_DEFAULTS,
} from '@/lib/constant';
import {
  FIELD_NAME_MAX_LENGTH,
  FIELD_SLUG_MAX_LENGTH,
  getFieldSlugError,
  normalizeFieldSlug,
} from '@/lib/field-slug';
import type {
  ICategory,
  IDropdown,
  IField,
  IFieldValidation,
  IRelationshipLabelPart,
  ITable,
} from '@/lib/interfaces';

// Campo da tabela relacionada usado como rótulo das opções. Derivado
// automaticamente (não há mais seletor manual): rowSlug, senão 1º texto, senão
// 1º campo não-nativo, senão fallback.
function pickLabelField(table: ITable): { id: string; slug: string } {
  const fields = table.fields ?? [];
  if (table.rowSlugFieldId) {
    const slugField = fields.find((f) => f._id === table.rowSlugFieldId);
    if (slugField) return { id: slugField._id, slug: slugField.slug };
  }
  const textField = fields.find(
    (f: IField) =>
      !f.native && !f.trashed && f.type === E_FIELD_TYPE.TEXT_SHORT,
  );
  if (textField) return { id: textField._id, slug: textField.slug };
  const anyField = fields.find((f: IField) => !f.native && !f.trashed);
  if (anyField) return { id: anyField._id, slug: anyField.slug };
  return { id: '', slug: 'nome' };
}

const FieldPermissionBindingSchema = z.object({
  kind: z.enum([
    E_PERMISSION_TARGET.PUBLIC,
    E_PERMISSION_TARGET.NOBODY,
    E_PERMISSION_TARGET.GROUP,
  ]),
  group: z.string().nullable().default(null),
});

export const FieldUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Título exibido é obrigatório')
    .max(
      FIELD_NAME_MAX_LENGTH,
      `O título exibido deve ter no máximo ${FIELD_NAME_MAX_LENGTH} caracteres`,
    ),
  slug: z
    .string()
    .min(1, 'Slug é obrigatório')
    .max(
      FIELD_SLUG_MAX_LENGTH,
      `O slug deve ter no máximo ${FIELD_SLUG_MAX_LENGTH} caracteres`,
    )
    .refine((value) => !getFieldSlugError(value), {
      message: 'Use apenas letras minúsculas, números e hífens',
    }),
  tip: z
    .string()
    .max(500, 'A dica deve ter no máximo 500 caracteres')
    .default(''),
  // Rótulo customizado por contexto (vazio = usa o name original).
  label: z
    .object({
      list: z.string().max(120, 'Máximo 120 caracteres').default(''),
      filter: z.string().max(120, 'Máximo 120 caracteres').default(''),
      form: z.string().max(120, 'Máximo 120 caracteres').default(''),
      detail: z.string().max(120, 'Máximo 120 caracteres').default(''),
    })
    .default({ list: '', filter: '', form: '', detail: '' }),
  type: z.string().min(1, 'Tipo é obrigatório'),
  format: z.string().default(''),
  validations: z.array(z.custom<IFieldValidation>()).default([]),
  defaultValue: z.string().default(''),
  dropdown: z.array(z.custom<IDropdown>()).default([]),
  allowCustomDropdownOptions: z.boolean().default(false),
  allowCreateRelationshipRecords: z.boolean().default(false),
  fillWithCurrentUserWhenEmpty: z.boolean().default(false),
  relationship: z.object({
    tableId: z.string().default(''),
    tableSlug: z.string().default(''),
    fieldId: z.string().default(''),
    fieldSlug: z.string().default(''),
    order: z.string().default(''),
    customLabel: z.boolean().default(false),
    labelParts: z.array(z.custom<IRelationshipLabelPart>()).default([]),
    labelSeparator: z.string().default(' - '),
    sourceVisible: z.boolean().default(true),
    mirrorMultiple: z.boolean().default(false),
    mirrorVisible: z.boolean().default(false),
    mirrorLabel: z.string().default(''),
    onDelete: z.string().default('SET_NULL'),
    formMode: z.enum(['select', 'manage']).default('select'),
    max: z.coerce.number().int().min(1).nullable().default(null),
  }),
  category: z.array(z.custom<ICategory>()).default([]),
  multiple: z.boolean().default(false),
  showInFilter: z.boolean().default(false),
  showInParentList: z.boolean().default(false),
  permissions: z
    .object({
      list: FieldPermissionBindingSchema,
      form: FieldPermissionBindingSchema,
      detail: FieldPermissionBindingSchema,
    })
    .default({
      list: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
      form: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
      detail: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
    }),
  required: z.boolean().default(false),
  trashed: z.boolean().default(false),
  widthInForm: z.number().default(50),
  widthInList: z.number().default(10),
  htmlContent: z.string().default(''),
});

export type FieldUpdateFormValues = z.infer<typeof FieldUpdateSchema>;

// Validação para campos nativos: só o rótulo é editável. Os demais campos
// (name/slug/type) são fixos e não devem reprovar o form — slugs nativos como
// `createdAt`/`_id` não passam na regra de slug de usuário. `.passthrough()`
// mantém os demais valores intactos para o submit.
export const FieldNativeUpdateSchema = z
  .object({
    label: z
      .object({
        list: z.string().max(120, 'Máximo 120 caracteres').default(''),
        filter: z.string().max(120, 'Máximo 120 caracteres').default(''),
        form: z.string().max(120, 'Máximo 120 caracteres').default(''),
        detail: z.string().max(120, 'Máximo 120 caracteres').default(''),
      })
      .default({ list: '', filter: '', form: '', detail: '' }),
  })
  .passthrough();

export const fieldUpdateFormDefaultValues: FieldUpdateFormValues = {
  name: '',
  slug: '',
  tip: '',
  label: { list: '', filter: '', form: '', detail: '' },
  type: '',
  format: '',
  validations: [],
  defaultValue: '',
  dropdown: [],
  allowCustomDropdownOptions: false,
  allowCreateRelationshipRecords: false,
  fillWithCurrentUserWhenEmpty: false,
  relationship: {
    tableId: '',
    tableSlug: '',
    fieldId: '',
    fieldSlug: '',
    order: '',
    customLabel: false,
    labelParts: [],
    labelSeparator: ' - ',
    sourceVisible: true,
    mirrorMultiple: false,
    mirrorVisible: false,
    mirrorLabel: '',
    onDelete: 'SET_NULL',
    formMode: 'select',
    max: null,
  },
  category: [],
  multiple: false,
  showInFilter: false,
  showInParentList: false,
  permissions: {
    list: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
    form: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
    detail: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
  },
  required: false,
  trashed: false,
  widthInForm: 50,
  widthInList: 10,
  htmlContent: '',
};

export const UpdateFieldFormFields = withForm({
  defaultValues: fieldUpdateFormDefaultValues,
  props: {
    isPending: false,
    // withForm infere o tipo do prop pelo default; a asserção define o tipo.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mode: 'show' as 'show' | 'edit',
    tableSlug: '',
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    table: undefined as ITable | undefined,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    targetField: undefined as IField | undefined,
    isLocked: false,
    isNative: false,
    isGroupField: false,
  },
  render: function Render({
    form,
    isPending,
    mode,
    tableSlug,
    table,
    targetField,
    isLocked,
    isNative,
    isGroupField,
  }) {
    // useStore para valores reativos do form
    const fieldName = useStore(form.store, (state) => state.values.name);
    const fieldType = useStore(form.store, (state) => state.values.type);
    const isTextShort = fieldType === E_FIELD_TYPE.TEXT_SHORT;
    const isTextLong = fieldType === E_FIELD_TYPE.TEXT_LONG;
    const isDropdown = fieldType === E_FIELD_TYPE.DROPDOWN;
    const isDate = fieldType === E_FIELD_TYPE.DATE;
    const isRelationship = fieldType === E_FIELD_TYPE.RELATIONSHIP;
    const isCategory = fieldType === E_FIELD_TYPE.CATEGORY;
    const isFile = fieldType === E_FIELD_TYPE.FILE;
    const isFieldGroup = fieldType === E_FIELD_TYPE.FIELD_GROUP;
    const isReaction = fieldType === E_FIELD_TYPE.REACTION;
    const isEvaluation = fieldType === E_FIELD_TYPE.EVALUATION;
    const isUser = fieldType === E_FIELD_TYPE.USER;
    const isUserGroup = fieldType === E_FIELD_TYPE.USER_GROUP;
    const isHtmlContent = fieldType === E_FIELD_TYPE.HTML_CONTENT;

    // useStore para reatividade - re-renderiza quando tableSlug muda
    const relationshipTableSlug = useStore(
      form.store,
      (state) => state.values.relationship.tableSlug,
    );
    const textLongFormat = useStore(form.store, (state) => state.values.format);
    const dropdownOptions = useStore(
      form.store,
      (state) => state.values.dropdown,
    );
    const categoryOptions = useStore(
      form.store,
      (state) => state.values.category,
    );
    const relationshipFieldSlug = useStore(
      form.store,
      (state) => state.values.relationship.fieldSlug,
    );
    const fieldMultiple = useStore(
      form.store,
      (state) => state.values.multiple,
    );
    const relationshipMirrorMultiple = useStore(
      form.store,
      (state) => state.values.relationship.mirrorMultiple,
    );
    const relationshipFormMode = useStore(
      form.store,
      (state) => state.values.relationship.formMode,
    );
    const relationshipCustomLabel = useStore(
      form.store,
      (state) => state.values.relationship.customLabel,
    );
    const relationshipLabelParts = useStore(
      form.store,
      (state) => state.values.relationship.labelParts,
    );
    const relationshipLabelSeparator = useStore(
      form.store,
      (state) => state.values.relationship.labelSeparator,
    );
    const isTrashed = useStore(form.store, (state) => state.values.trashed);

    // Modo 'manage' (repetidor via /links) só faz sentido em N:N (os dois lados
    // múltiplos). 1:1/1:N são geridos via FK no payload da row.
    const isManyToMany = fieldMultiple && relationshipMirrorMultiple;

    const relatedTable = useReadTable({ slug: relationshipTableSlug });
    const tabelaAtual = table?.name ?? 'esta tabela';
    const tabelaRelacionada = relatedTable.data?.name ?? 'a tabela relacionada';

    const showMultiple =
      isDropdown ||
      isFile ||
      isFieldGroup ||
      isCategory ||
      isUser ||
      isUserGroup;
    const showRequired = !isReaction && !isEvaluation && !isHtmlContent;

    const isDisabled = mode === 'show' || isPending;
    const lockAllControls = isLocked && !isDropdown;
    const lockNonOptions = isLocked && isDropdown;

    // Rótulo auto-derivado: ao escolher a tabela alvo, define qual campo dela
    // vira o rótulo das opções (sem seletor manual). Só preenche se vazio.
    useEffect(() => {
      if (!isRelationship) return;
      if (!relatedTable.data) return;
      if (relationshipFieldSlug) return;
      const picked = pickLabelField(relatedTable.data);
      form.setFieldValue('relationship.fieldId', picked.id);
      form.setFieldValue('relationship.fieldSlug', picked.slug);
      // @ts-expect-error TanStack Form type depth issue with nested configuration
    }, [isRelationship, relatedTable.data, relationshipFieldSlug, form]);

    // Campo nativo: name/slug são fixos. Só permitimos customizar o rótulo de
    // exibição (label). Demais controles ficam ocultos.
    if (isNative) {
      const nativePlaceholder =
        NATIVE_FIELD_LABEL_DEFAULTS[targetField?.slug ?? ''] ??
        targetField?.name ??
        '';
      return (
        <section
          data-test-id="field-update-form-fields"
          className="space-y-4 p-3 sm:p-2"
        >
          <Accordion
            type="single"
            collapsible
            defaultValue="labels"
            className="rounded-lg border"
          >
            <AccordionItem
              value="labels"
              className="px-3"
            >
              <AccordionTrigger className="py-3 text-sm font-medium text-muted-foreground hover:no-underline">
                Rótulos por contexto
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <form.AppField name="label.list">
                    {(field) => (
                      <field.FieldText
                        label="Na listagem"
                        placeholder={nativePlaceholder}
                        disabled={isDisabled}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="label.filter">
                    {(field) => (
                      <field.FieldText
                        label="Nos filtros"
                        placeholder={nativePlaceholder}
                        disabled={isDisabled}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="label.form">
                    {(field) => (
                      <field.FieldText
                        label="No formulário"
                        placeholder={nativePlaceholder}
                        disabled={isDisabled}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="label.detail">
                    {(field) => (
                      <field.FieldText
                        label="Nos detalhes"
                        placeholder={nativePlaceholder}
                        disabled={isDisabled}
                      />
                    )}
                  </form.AppField>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      );
    }

    return (
      <section
        data-test-id="field-update-form-fields"
        className="space-y-4 p-3 sm:p-2"
      >
        <form.AppField
          name="name"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim() === '') {
                return 'Título exibido é obrigatório';
              }
              if (value.length > FIELD_NAME_MAX_LENGTH) {
                return `O título exibido deve ter no máximo ${FIELD_NAME_MAX_LENGTH} caracteres`;
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <field.FieldTextarea
              label="Título exibido"
              placeholder="Título exibido para o usuário final"
              disabled={isDisabled || isLocked}
              rows={3}
              required
            />
          )}
        </form.AppField>

        <Accordion
          type="single"
          collapsible
          defaultValue="labels"
          className="rounded-lg border"
        >
          <AccordionItem
            value="labels"
            className="px-3"
          >
            <AccordionTrigger className="py-3 text-sm font-medium text-muted-foreground hover:no-underline">
              Rótulos por contexto
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <form.AppField name="label.list">
                  {(field) => (
                    <field.FieldText
                      label="Na listagem"
                      placeholder={fieldName || 'Igual ao título exibido'}
                      disabled={isDisabled || isLocked}
                    />
                  )}
                </form.AppField>
                <form.AppField name="label.filter">
                  {(field) => (
                    <field.FieldText
                      label="Nos filtros"
                      placeholder={fieldName || 'Igual ao título exibido'}
                      disabled={isDisabled || isLocked}
                    />
                  )}
                </form.AppField>
                <form.AppField name="label.form">
                  {(field) => (
                    <field.FieldText
                      label="No formulário"
                      placeholder={fieldName || 'Igual ao título exibido'}
                      disabled={isDisabled || isLocked}
                    />
                  )}
                </form.AppField>
                <form.AppField name="label.detail">
                  {(field) => (
                    <field.FieldText
                      label="Nos detalhes"
                      placeholder={fieldName || 'Igual ao título exibido'}
                      disabled={isDisabled || isLocked}
                    />
                  )}
                </form.AppField>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <form.AppField
          name="slug"
          validators={{
            onChange: ({ value }) => getFieldSlugError(value),
          }}
        >
          {(field) => (
            <field.FieldText
              label="Slug"
              placeholder="nome-slug-campo"
              disabled={isDisabled || isLocked || isGroupField}
              icon={<FileTextIcon />}
              description={
                (isGroupField &&
                  'Slug técnico do campo de grupo. Alteração bloqueada para proteger dados existentes.') ||
                'Identificador técnico usado em consultas e integrações'
              }
              onChangeTransform={normalizeFieldSlug}
              required
            />
          )}
        </form.AppField>

        <form.AppField name="tip">
          {(field) => (
            <field.FieldTextarea
              label="Dica do campo"
              placeholder="Texto de ajuda exibido no formulário"
              disabled={isDisabled || isLocked}
              rows={2}
            />
          )}
        </form.AppField>

        {/* Campo Tipo (oculto para grupo de campos) */}
        {!isFieldGroup && (
          <form.AppField name="type">
            {(field) => (
              <field.TableFieldTypeSelect
                label="Tipo"
                placeholder="Tipo do campo"
                disabled={true}
                blockedTypes={[]}
              />
            )}
          </form.AppField>
        )}

        {/* Conteúdo HTML (HTML_CONTENT) */}
        {isHtmlContent && (
          <form.AppField name="htmlContent">
            {(field) => (
              <field.FieldEditor
                label="Conteúdo HTML"
                defaultMode="rich"
              />
            )}
          </form.AppField>
        )}

        {/* Campo Formato (TEXT_SHORT) */}
        {isTextShort && (
          <form.AppField
            name="format"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === '') {
                  return 'Formato é obrigatório';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <field.TableFieldFormatSelect
                label="Formato"
                placeholder="Selecione um formato para o campo"
                disabled={isDisabled || lockAllControls}
                fieldType={E_FIELD_TYPE.TEXT_SHORT}
                required
              />
            )}
          </form.AppField>
        )}

        {/* Campo Valor Padrão (TEXT_SHORT) */}
        {isTextShort && (
          <form.AppField name="defaultValue">
            {(field) => (
              <field.FieldText
                label="Valor padrão"
                placeholder="Valor padrão (deixe em branco se não houver)"
                disabled={isDisabled || lockAllControls}
              />
            )}
          </form.AppField>
        )}

        {/* Campo Formato (TEXT_LONG) */}
        {isTextLong && (
          <form.AppField
            name="format"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === '') {
                  return 'Formato é obrigatório';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <field.TableFieldFormatSelect
                label="Formato"
                placeholder="Selecione um formato para o campo"
                disabled={isDisabled || lockAllControls}
                fieldType={E_FIELD_TYPE.TEXT_LONG}
                required
              />
            )}
          </form.AppField>
        )}

        {/* Campo Valor Padrão (TEXT_LONG - Editor Rico) */}
        {isTextLong && textLongFormat === E_FIELD_FORMAT.RICH_TEXT && (
          <form.AppField name="defaultValue">
            {(field) => <field.FieldEditor label="Valor padrão" />}
          </form.AppField>
        )}

        {/* Campo Valor Padrão (TEXT_LONG - Área de Texto) */}
        {isTextLong && textLongFormat !== E_FIELD_FORMAT.RICH_TEXT && (
          <form.AppField name="defaultValue">
            {(field) => (
              <field.FieldTextarea
                label="Valor padrão"
                placeholder="Valor padrão (Se deixar em branco, o campo ficará vazio)"
                disabled={isDisabled || lockAllControls}
                rows={3}
              />
            )}
          </form.AppField>
        )}

        {/* Campo Dropdown */}
        {isDropdown && (
          <form.AppField
            name="dropdown"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.length === 0) {
                  return 'Adicione ao menos uma opção';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <field.TableFieldDropdownOptions
                label="Opções"
                placeholder="Escreva e adicione"
                disabled={isDisabled}
                required
              />
            )}
          </form.AppField>
        )}

        {/* Valor padrão do Dropdown */}
        {isDropdown && (
          <form.AppField name="defaultValue">
            {(field) => (
              <field.TableFieldDropdownDefaultValue
                label="Valor padrão"
                disabled={isDisabled}
                dropdown={dropdownOptions}
              />
            )}
          </form.AppField>
        )}

        {isDropdown && (
          <form.AppField name="allowCustomDropdownOptions">
            {(field) => (
              <field.FieldBooleanSwitch
                label="Permitir usuário inserir novas tags"
                description="Permite salvar uma nova opção quando o usuário digitar um valor que ainda não existe."
                disabled={isDisabled || lockNonOptions}
              />
            )}
          </form.AppField>
        )}

        {isRelationship && (
          <form.AppField name="allowCreateRelationshipRecords">
            {(field) => (
              <field.FieldBooleanSwitch
                label="Permitir adicionar novos registros"
                description="Exibe a opção Novo para criar um registro na tabela relacionada durante o preenchimento."
                disabled={isDisabled || lockNonOptions}
              />
            )}
          </form.AppField>
        )}

        {/* Campo Formato Data */}
        {isDate && (
          <form.AppField
            name="format"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === '') {
                  return 'Formato da data é obrigatório';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <field.TableFieldFormatSelect
                label="Formato da data"
                placeholder="Selecione o formato da data"
                disabled={isDisabled || lockAllControls}
                fieldType={E_FIELD_TYPE.DATE}
                required
              />
            )}
          </form.AppField>
        )}

        {/* Campo Valor Padrão (DATE) */}
        {isDate && (
          <form.AppField name="defaultValue">
            {(field) => (
              <field.TableFieldDateDefaultValue
                label="Valor padrão"
                disabled={isDisabled || lockAllControls}
              />
            )}
          </form.AppField>
        )}

        {/* Campo Tabela de Relacionamento */}
        {isRelationship && (
          <form.AppField
            name="relationship.tableId"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === '') {
                  return 'Tabela de relacionamento é obrigatória';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <field.TableFieldRelationshipTableSelect
                label="Tabela de relacionamento"
                placeholder="Selecione uma tabela"
                disabled={isDisabled || lockAllControls}
                onTableChange={(slug) => {
                  form.setFieldValue('relationship.tableSlug', slug);
                  form.setFieldValue('relationship.fieldId', '');
                  form.setFieldValue('relationship.fieldSlug', '');
                }}
                required
              />
            )}
          </form.AppField>
        )}

        {isRelationship &&
          relationshipTableSlug &&
          relationshipTableSlug === tableSlug && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
              Auto-relacionamento: este campo vincula registros da própria
              tabela.
            </div>
          )}

        {/* Campo Ordem (Relacionamento) */}
        {isRelationship && (
          <form.AppField
            name="relationship.order"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === '') {
                  return 'Ordem é obrigatória';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <field.TableFieldRelationshipOrderSelect
                label="Ordem"
                placeholder="Selecione uma ordem"
                disabled={isDisabled || lockAllControls}
                required
              />
            )}
          </form.AppField>
        )}

        {/* Modo de vínculo no formulário (relacionamento) — só N:N */}
        {isRelationship && relationshipTableSlug && isManyToMany && (
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Gerenciar registros internamente
              </p>
              <p className="text-xs text-muted-foreground">
                Ligado: tabelas internas (lado A/B), cards e Sheet para
                criar/editar registros. Desligado: vínculo simples por
                multi-select (selecionar/criar e vincular).
              </p>
            </div>
            <Switch
              checked={relationshipFormMode === 'manage'}
              disabled={isDisabled || lockAllControls}
              onCheckedChange={(checked: boolean): void => {
                let nextMode: 'select' | 'manage' = 'select';
                if (checked) nextMode = 'manage';
                form.setFieldValue('relationship.formMode', nextMode);
              }}
            />
          </div>
        )}

        {/* Configuração de cardinalidade e vínculo (relacionamento) */}
        {isRelationship && relationshipTableSlug && (
          <>
            <form.AppField name="multiple">
              {(field) => (
                <field.FieldBooleanSwitch
                  label={`Um registro de ${tabelaAtual} pode ter vários de ${tabelaRelacionada}?`}
                  description={`Se ligado, cada registro de ${tabelaAtual} pode se vincular a vários de ${tabelaRelacionada}.`}
                  disabled={isDisabled || lockNonOptions}
                />
              )}
            </form.AppField>

            <form.AppField name="relationship.mirrorMultiple">
              {(field) => (
                <field.FieldBooleanSwitch
                  label={`Um registro de ${tabelaRelacionada} pode ter vários de ${tabelaAtual}?`}
                  description={`Se ligado, cada registro de ${tabelaRelacionada} pode se vincular a vários de ${tabelaAtual}.`}
                  disabled={isDisabled || lockAllControls}
                />
              )}
            </form.AppField>

            {isManyToMany && relationshipFormMode === 'manage' && (
              <>
                <form.AppField name="relationship.sourceVisible">
                  {(field) => (
                    <field.FieldBooleanSwitch
                      label={`Gerenciar a relação pela tabela ${tabelaAtual}`}
                      description={`Mostra a tabela de vínculos ao abrir um registro de ${tabelaAtual}.`}
                      disabled={isDisabled || lockAllControls}
                    />
                  )}
                </form.AppField>

                <form.AppField name="relationship.mirrorVisible">
                  {(field) => (
                    <field.FieldBooleanSwitch
                      label={`Gerenciar a relação pela tabela ${tabelaRelacionada}`}
                      description={`Mostra a tabela de vínculos ao abrir um registro de ${tabelaRelacionada}.`}
                      disabled={isDisabled || lockAllControls}
                    />
                  )}
                </form.AppField>
              </>
            )}

            {fieldMultiple && (
              <form.AppField name="relationship.max">
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor={field.name}
                      className="text-sm font-medium"
                    >
                      Máximo de vínculos por registro
                    </label>
                    <input
                      id={field.name}
                      type="number"
                      min={1}
                      placeholder="Ilimitado"
                      disabled={isDisabled || lockAllControls}
                      value={field.state.value ?? ''}
                      onChange={(e): void => {
                        let maxVal: number | null = null;
                        if (e.target.value) maxVal = Number(e.target.value);
                        field.handleChange(maxVal);
                      }}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Limite de vínculos por registro neste lado. Vazio =
                      ilimitado.
                    </p>
                  </div>
                )}
              </form.AppField>
            )}

            <form.AppField name="relationship.onDelete">
              {(field) => (
                <field.TableFieldRelationshipOnDeleteSelect
                  label="Comportamento ao excluir"
                  required
                  disabled={isDisabled || lockAllControls}
                />
              )}
            </form.AppField>

            <TableFieldRelationshipCardinality
              sourceMultiple={fieldMultiple}
              mirrorMultiple={relationshipMirrorMultiple}
            />

            {relationshipFormMode === 'select' && (
              <>
                <form.AppField name="relationship.fieldId">
                  {(field) => (
                    <field.TableFieldRelationshipFieldSelect
                      label="Rótulo"
                      placeholder="Selecione o campo de exibição"
                      disabled={isDisabled || lockAllControls}
                      tableSlug={relationshipTableSlug}
                      onFieldChange={(slug) => {
                        form.setFieldValue('relationship.fieldSlug', slug);
                      }}
                    />
                  )}
                </form.AppField>

                <form.AppField name="relationship.customLabel">
                  {(field) => (
                    <field.FieldBooleanSwitch
                      label="Personalizar exibição das opções"
                      description="Por padrão a opção exibe apenas o campo principal. Ative para compor o label com um ou mais campos (inclusive de tabelas relacionadas) e escolher o separador."
                      disabled={isDisabled || lockAllControls}
                    />
                  )}
                </form.AppField>

                {relationshipCustomLabel && (
                  <TableFieldRelationshipLabelComposer
                    rootTableSlug={relationshipTableSlug}
                    parts={relationshipLabelParts}
                    separator={relationshipLabelSeparator}
                    disabled={isDisabled || lockAllControls}
                    onChange={(parts, separator) => {
                      form.setFieldValue('relationship.labelParts', parts);
                      form.setFieldValue(
                        'relationship.labelSeparator',
                        separator,
                      );
                    }}
                  />
                )}
              </>
            )}
          </>
        )}

        {isRelationship &&
          table &&
          targetField &&
          relationshipTableSlug &&
          relationshipFieldSlug &&
          !isGroupField && (
            <ExtensionSlot
              id="table.field.relationship.config"
              context={{
                table,
                tableSlug,
                targetField,
                targetFieldId: targetField._id,
                targetFieldSlug: targetField.slug,
                sourceTableSlug: relationshipTableSlug,
                relationshipFieldSlug,
                disabled: isPending || lockAllControls,
                mode,
              }}
            />
          )}

        {/* Campo Categoria (Tree) */}
        {isCategory && (
          <form.AppField
            name="category"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.length === 0) {
                  return 'Estrutura da categoria é obrigatória';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <field.TableFieldCategoryTree
                label="Estrutura da categoria"
                required
              />
            )}
          </form.AppField>
        )}

        {/* Campo Valor Padrão (CATEGORY) */}
        {isCategory && categoryOptions.length > 0 && (
          <form.AppField name="defaultValue">
            {(field) => (
              <field.TableFieldCategoryDefaultValue
                label="Valor padrão"
                disabled={isDisabled || lockAllControls}
                categories={categoryOptions}
              />
            )}
          </form.AppField>
        )}

        {/* Campo Valor Padrão (USER) */}
        {isUser && (
          <form.AppField name="defaultValue">
            {(field) => (
              <field.TableFieldUserDefaultValue
                label="Valor padrão"
                disabled={isDisabled || lockAllControls}
              />
            )}
          </form.AppField>
        )}

        {/* Campo Valor Padrão (USER_GROUP) */}
        {isUserGroup && (
          <form.AppField name="defaultValue">
            {(field) => (
              <field.FieldGroupCombobox
                label="Valor padrão"
                placeholder="Sem valor padrão"
                disabled={isDisabled || lockAllControls}
              />
            )}
          </form.AppField>
        )}

        {/* Campo USER: gravar o usuário logado quando vazio */}
        {isUser && (
          <form.AppField name="fillWithCurrentUserWhenEmpty">
            {(field) => (
              <field.FieldBooleanSwitch
                label="Usar usuário logado quando vazio"
                description="Preencher com o usuário logado quando nenhum usuário for informado no registro?"
                disabled={isDisabled || lockAllControls}
              />
            )}
          </form.AppField>
        )}

        {/* Campo Múltiplos */}
        {showMultiple && (
          <form.AppField name="multiple">
            {(field) => (
              <field.FieldBooleanSwitch
                label="Permitir múltiplos"
                description="Este campo deve permitir múltiplos valores?"
                disabled={isDisabled || lockNonOptions}
              />
            )}
          </form.AppField>
        )}

        {/* Validações do campo */}
        {(isTextShort || isTextLong || isUser) && (
          <form.AppField name="validations">
            {(field) => (
              <field.TableFieldValidationsField
                label="Validações"
                fieldType={fieldType}
                multiple={fieldMultiple}
                disabled={isPending}
              />
            )}
          </form.AppField>
        )}

        {/* Visibilidade do campo por grupo (Lista / Formulário / Detalhes) */}
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium text-muted-foreground">
            Visibilidade por grupo
          </p>
          <form.AppField name="permissions.list">
            {(field) => (
              <field.FieldPermissionBinding
                label="Lista"
                disabled={isDisabled}
              />
            )}
          </form.AppField>
          <form.AppField name="permissions.form">
            {(field) => (
              <field.FieldPermissionBinding
                label="Formulário"
                disabled={isDisabled}
              />
            )}
          </form.AppField>
          <form.AppField name="permissions.detail">
            {(field) => (
              <field.FieldPermissionBinding
                label="Detalhes"
                disabled={isDisabled}
              />
            )}
          </form.AppField>
        </div>

        {/* Campo Obrigatoriedade */}
        {showRequired && (
          <form.AppField name="required">
            {(field) => (
              <field.FieldBooleanSwitch
                label="Obrigatoriedade"
                description="Este campo é obrigatório?"
                disabled={isDisabled || lockNonOptions || isTrashed}
              />
            )}
          </form.AppField>
        )}

        {/* Campo-filho de grupo: exibir na listagem geral da lista */}
        {isGroupField && (
          <form.AppField name="showInParentList">
            {(field) => (
              <field.FieldBooleanSwitch
                label="Exibir na listagem geral da lista"
                description="Tornar este campo disponível em Gerenciar da lista principal?"
                disabled={isDisabled || isTrashed}
              />
            )}
          </form.AppField>
        )}

        {/* Campo Lixeira */}
        <form.AppField name="trashed">
          {(field) => (
            <field.FieldBooleanSwitch
              label="Enviar para lixeira"
              description="Enviar este campo para a lixeira?"
              disabled={isDisabled || isLocked}
              className="border-destructive/50"
            />
          )}
        </form.AppField>
      </section>
    );
  },
});
