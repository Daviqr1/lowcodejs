import {
  createLazyFileRoute,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import { toast } from 'sonner';

import { CreateFieldSkeleton } from './-create-field-skeleton';
import {
  CreateFieldFormFields,
  FieldCreateSchema,
  fieldCreateFormDefaultValues,
} from './-create-form';

import { FormFooter } from '@/components/common/form-footer';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { AccessDenied } from '@/components/common/route-status/access-denied';
import type { TreeNode } from '@/components/common/tree-editor/tree-list';
import { useSidebar } from '@/components/ui/sidebar';
import { useFieldCreate } from '@/hooks/tanstack-query/use-field-create';
import { useGroupFieldCreate } from '@/hooks/tanstack-query/use-group-field-create';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useTablePermission } from '@/hooks/use-table-permission';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import type { E_FIELD_FORMAT } from '@/lib/constant';
import {
  CHIPS_LIMIT_FIELD_TYPES,
  E_FIELD_TYPE,
  E_TABLE_TYPE,
} from '@/lib/constant';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';
import type { ICategory, IField, ValueOf } from '@/lib/interfaces';

export const Route = createLazyFileRoute(
  '/_private/tables/$slug/field/create/',
)({
  component: RouteComponent,
});

function normalizeDefaultValue(
  type: string,
  defaultValue: string | Array<string>,
): string | Array<string> | null {
  const arrayTypes: Array<string> = [
    E_FIELD_TYPE.DROPDOWN,
    E_FIELD_TYPE.CATEGORY,
    E_FIELD_TYPE.USER,
    E_FIELD_TYPE.USER_GROUP,
    E_FIELD_TYPE.RELATIONSHIP,
  ];

  if (arrayTypes.includes(type)) {
    if (Array.isArray(defaultValue)) {
      if (defaultValue.length > 0) return defaultValue;
      return null;
    }
    if (defaultValue) return [defaultValue];
    return null;
  }

  // TEXT_SHORT, TEXT_LONG, DATE → string
  if (Array.isArray(defaultValue)) {
    if (defaultValue.length > 0) return defaultValue[0];
    return null;
  }
  return defaultValue || null;
}

function normalizeTip(tip: string): string | null {
  const normalized = tip.trim();
  if (normalized.length > 0) return normalized;
  return null;
}

function convertTreeNodeToCategory(nodes: Array<TreeNode>): Array<ICategory> {
  return nodes.map((node) => {
    let children: Array<ICategory> = [];
    if (node.children) children = convertTreeNodeToCategory(node.children);
    return { id: node.id, label: node.label, children };
  });
}

function RouteComponent(): React.JSX.Element {
  const sidebar = useSidebar();
  const navigate = useNavigate();

  const { slug } = useParams({
    from: '/_private/tables/$slug/field/create/',
  });

  const { 'field-type': defaultFieldType, group: groupSlug } = useSearch({
    from: '/_private/tables/$slug/field/create/',
  });

  const table = useReadTable({ slug });
  const permission = useTablePermission(table.data);

  const onCreateSuccess = (): void => {
    toast.success('Campo criado', {
      description: 'O campo foi criado com sucesso',
    });
    form.reset();
    sidebar.setOpen(false);
    navigate({
      to: '/tables/$slug',
      replace: true,
      params: { slug },
    });
  };

  const onCreateError = (error: Error): void => {
    handleApiError(error, {
      context: 'Erro ao criar o campo',
      onFieldErrors: (errors) => applyApiFieldErrors(form, errors),
    });
  };

  // Hooks devem ser chamados ANTES de qualquer early return (Regra dos Hooks do React)
  const _create = useFieldCreate({
    slug,
    onSuccess: onCreateSuccess,
    onError: onCreateError,
  });

  const _createGroupField = useGroupFieldCreate({
    onSuccess: onCreateSuccess,
    onError: onCreateError,
  });

  const form = useAppForm({
    defaultValues: {
      ...fieldCreateFormDefaultValues,
      type: defaultFieldType ?? '',
    },
    // @ts-expect-error Zod Standard Schema type inference
    validators: { onChange: FieldCreateSchema, onSubmit: FieldCreateSchema },
    onSubmit: async ({ value }) => {
      if (
        _create.status === 'pending' ||
        _createGroupField.status === 'pending'
      )
        return;

      const hasRelationship = value.relationship.tableId !== '';
      const hasDropdown = (value.dropdown?.length ?? 0) > 0;
      const hasCategory = (value.category?.length ?? 0) > 0;

      let htmlContent: string | undefined;
      if (value.type === E_FIELD_TYPE.HTML_CONTENT) {
        htmlContent = value.htmlContent || undefined;
      }

      // Rótulo por contexto: vazio → null (volta ao name naquele contexto).
      const labelList = value.label.list?.trim() || null;
      const labelFilter = value.label.filter?.trim() || null;
      const labelForm = value.label.form?.trim() || null;
      const labelDetail = value.label.detail?.trim() || null;

      let payloadLabel: {
        list: string | null;
        filter: string | null;
        form: string | null;
        detail: string | null;
      } | null = null;
      if (labelList || labelFilter || labelForm || labelDetail) {
        payloadLabel = {
          list: labelList,
          filter: labelFilter,
          form: labelForm,
          detail: labelDetail,
        };
      }

      // value.format vem do formulário como string; o campo aceita o enum.
      let format: ValueOf<typeof E_FIELD_FORMAT> | null = null;
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      if (value.format) format = value.format as ValueOf<typeof E_FIELD_FORMAT>;

      let dropdown: typeof value.dropdown = [];
      if (hasDropdown) dropdown = value.dropdown.map((item) => item);

      let allowCustomDropdownOptions = false;
      if (value.type === E_FIELD_TYPE.DROPDOWN) {
        allowCustomDropdownOptions = value.allowCustomDropdownOptions;
      }

      let allowCreateRelationshipRecords = false;
      if (value.type === E_FIELD_TYPE.RELATIONSHIP) {
        allowCreateRelationshipRecords = value.allowCreateRelationshipRecords;
      }

      let fillWithCurrentUserWhenEmpty = false;
      if (value.type === E_FIELD_TYPE.USER) {
        fillWithCurrentUserWhenEmpty = value.fillWithCurrentUserWhenEmpty;
      }

      // Só os campos que renderizam chips guardam o limite do resumo "+N".
      let visibleChipsLimit: number | null = null;
      if (CHIPS_LIMIT_FIELD_TYPES.includes(value.type)) {
        visibleChipsLimit = value.visibleChipsLimit;
      }

      let relationship: IField['relationship'] = null;
      if (hasRelationship) {
        let labelParts: typeof value.relationship.labelParts = [];
        if (value.relationship.customLabel) {
          labelParts = value.relationship.labelParts;
        }
        relationship = {
          table: {
            _id: value.relationship.tableId,
            slug: value.relationship.tableSlug,
          },
          field: {
            _id: value.relationship.fieldId,
            slug: value.relationship.fieldSlug,
          },
          // order/onDelete vêm do form como string; reduzem à união literal.
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          order: (value.relationship.order || 'asc') as 'asc' | 'desc',
          customLabel: value.relationship.customLabel,
          labelParts,
          labelSeparator: value.relationship.labelSeparator || ' - ',
          visible: value.relationship.sourceVisible,
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          onDelete: value.relationship.onDelete as
            | 'CASCADE'
            | 'SET_NULL'
            | 'RESTRICT',
          mirror: {
            multiple: value.relationship.mirrorMultiple,
            visible: value.relationship.mirrorVisible,
            label: value.relationship.mirrorLabel || undefined,
          },
          formMode: value.relationship.formMode,
          max: value.relationship.max ?? null,
        };
      }

      let category: Array<ICategory> = [];
      if (hasCategory) category = convertTreeNodeToCategory(value.category);

      const payload: Partial<IField> = {
        name: value.name,
        slug: value.slug,
        tip: normalizeTip(value.tip),
        label: payloadLabel,
        // value.type vem do select do formulario (string); reduz ao enum.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        type: value.type as keyof typeof E_FIELD_TYPE,
        required: value.required,
        multiple: value.multiple,
        showInFilter: value.showInFilter,
        showInParentList: value.showInParentList,
        permissions: value.permissions,
        widthInForm: value.widthInForm,
        widthInList: value.widthInList,
        visibleChipsLimit,
        format,
        validations: value.validations,
        defaultValue: normalizeDefaultValue(value.type, value.defaultValue),
        dropdown,
        allowCustomDropdownOptions,
        allowCreateRelationshipRecords,
        fillWithCurrentUserWhenEmpty,
        relationship,
        category,
        htmlContent,
      };

      if (groupSlug) {
        await _createGroupField.mutateAsync({
          tableSlug: slug,
          groupSlug,
          data: payload,
        });
      } else {
        await _create.mutateAsync({
          ...payload,
          group: null,
        });
      }
    },
  });

  useApiErrorAutoClear(form);

  // Loading enquanto verifica permissão
  if (table.status === 'pending' || permission.isLoading) {
    return <CreateFieldSkeleton />;
  }

  // Mostrar erro se não tem permissão
  if (!permission.can('CREATE_FIELD')) {
    return <AccessDenied />;
  }

  // Blocked types for field-group tables or when in group context
  let blockedTypes: Array<ValueOf<typeof E_FIELD_TYPE>> = [];
  if (
    !!groupSlug ||
    (table.status === 'success' && table.data.type === E_TABLE_TYPE.FIELD_GROUP)
  ) {
    blockedTypes = [
      E_FIELD_TYPE.FIELD_GROUP,
      E_FIELD_TYPE.REACTION,
      E_FIELD_TYPE.EVALUATION,
      E_FIELD_TYPE.RELATIONSHIP,
    ];
  }

  const isPending =
    _create.status === 'pending' || _createGroupField.status === 'pending';

  const goBack = (): void => {
    sidebar.setOpen(false);
    navigate({
      to: '/tables/$slug',
      replace: true,
      params: { slug },
    });
  };

  let headerTitle = 'Novo campo';
  if (defaultFieldType === E_FIELD_TYPE.FIELD_GROUP) {
    headerTitle = 'Novo grupo de campos';
  }

  return (
    <PageShell data-test-id="create-field-page">
      {/* Header */}
      <PageShell.Header borderBottom={false}>
        <PageHeader
          onBack={goBack}
          title={headerTitle}
        />
      </PageShell.Header>

      {/* Info text for field group */}
      {defaultFieldType === E_FIELD_TYPE.FIELD_GROUP && (
        <p className="text-sm text-muted-foreground px-2 pb-2">
          O grupo de campos é composto por outros campos que devem ser
          configurados nas configurações da tabela em "Gerenciar grupo de
          campos".
        </p>
      )}

      {/* Content */}
      <form
        id="field-create-form"
        data-test-id="create-field-form"
        className="flex-1 flex flex-col min-h-0 overflow-auto"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        {/* @ts-expect-error TanStack Form type instantiation depth issue with nested defaultValues */}
        <CreateFieldFormFields
          form={form}
          isPending={isPending}
          tableSlug={slug}
          blockedTypes={blockedTypes}
          isGroupField={!!groupSlug}
          defaultFieldType={defaultFieldType}
        />
      </form>

      {/* Footer */}
      <PageShell.Footer>
        <FormFooter
          form={form}
          onCancel={goBack}
          submitLabel="Criar"
          submitTestId="create-field-submit-btn"
        />
      </PageShell.Footer>
    </PageShell>
  );
}
