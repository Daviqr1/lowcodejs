import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import type {
  FieldManagementActions,
  VisibilityKey,
  WidthKey,
} from '@/components/common/dynamic-table/field-management/field-management-context';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useUpdateTable } from '@/hooks/tanstack-query/use-table-update';
import { API } from '@/lib/api';
import { E_PERMISSION_TARGET } from '@/lib/constant';
import type {
  IField,
  IPermissionBinding,
  ITable,
  Paginated,
} from '@/lib/interfaces';
import type { FieldContext } from '@/lib/permission';
import { isFieldShownInContext } from '@/lib/permission';
import { resolveFieldLabel } from '@/lib/table';

// Chave de visibilidade do toggle -> contexto do binding. `showInFilter` não é
// permissão (config de filtro), então não mapeia.
const CONTEXT_BY_VISIBILITY_KEY: Partial<Record<VisibilityKey, FieldContext>> =
  {
    showInList: 'list',
    showInForm: 'form',
    showInDetail: 'detail',
  };

// Traduz o toggle (mostrar/ocultar) para o override do payload: `showInFilter`
// continua booleano; list/form/detail viram binding PUBLIC (visível) ou NOBODY
// (oculto) no mapa `permissions`.
function buildVisibilityOverride(
  field: IField,
  visibilityKey: VisibilityKey,
  newValue: boolean,
): Record<string, unknown> {
  if (visibilityKey === 'showInFilter') {
    return { showInFilter: newValue };
  }

  const context = CONTEXT_BY_VISIBILITY_KEY[visibilityKey];
  if (!context) return {};

  const publicBinding: IPermissionBinding = {
    kind: E_PERMISSION_TARGET.PUBLIC,
    group: null,
  };
  const nobodyBinding: IPermissionBinding = {
    kind: E_PERMISSION_TARGET.NOBODY,
    group: null,
  };

  const base = field.permissions ?? {
    list: publicBinding,
    form: publicBinding,
    detail: publicBinding,
  };

  let nextBinding = nobodyBinding;
  if (newValue) nextBinding = publicBinding;

  return { permissions: { ...base, [context]: nextBinding } };
}

function buildFieldPayload(
  field: IField,
  overrides: Partial<IField>,
): Record<string, unknown> {
  const hasRelationship = field.relationship !== null;
  const hasDropdown = (field.dropdown?.length ?? 0) > 0;
  const hasCategory = (field.category?.length ?? 0) > 0;
  let group: { slug: string; _id?: string } | null = null;
  if (field.group) {
    group = { slug: field.group.slug };
    if (field.group._id) {
      group._id = field.group._id;
    }
  }

  let dropdown: unknown = [];
  if (hasDropdown) dropdown = field.dropdown;

  let category: unknown = [];
  if (hasCategory) category = field.category;

  let relationship: unknown = null;
  if (hasRelationship) {
    relationship = {
      table: {
        _id: field.relationship!.table._id,
        slug: field.relationship!.table.slug,
      },
      field: {
        _id: field.relationship!.field._id,
        slug: field.relationship!.field.slug,
      },
      order: field.relationship!.order,
      relationshipId: field.relationship!.relationshipId ?? null,
      side: field.relationship!.side ?? null,
      formMode: field.relationship!.formMode,
      visible: field.relationship!.visible,
      onDelete: field.relationship!.onDelete,
      mirror: field.relationship!.mirror ?? null,
      max: field.relationship!.max ?? null,
    };
  }

  return {
    name: field.name,
    type: field.type,
    required: field.required,
    multiple: field.multiple,
    showInFilter: field.showInFilter,
    permissions: field.permissions ?? null,
    widthInForm: field.widthInForm,
    widthInList: field.widthInList,
    widthInDetail: field.widthInDetail,
    format: field.format ?? null,
    defaultValue: field.defaultValue ?? null,
    dropdown,
    relationship,
    group,
    category,
    trashed: field.trashed,
    trashedAt: field.trashedAt ?? null,
    ...overrides,
  };
}

const VISIBILITY_LABELS: Record<VisibilityKey, string> = {
  showInList: 'listagem',
  showInFilter: 'filtros',
  showInForm: 'formulários',
  showInDetail: 'detalhes',
};

const ORDER_FIELD_KEY_BY_VISIBILITY: Record<
  VisibilityKey,
  'fieldOrderList' | 'fieldOrderForm' | 'fieldOrderFilter' | 'fieldOrderDetail'
> = {
  showInList: 'fieldOrderList',
  showInForm: 'fieldOrderForm',
  showInFilter: 'fieldOrderFilter',
  showInDetail: 'fieldOrderDetail',
};

function updateFieldInTableCache(
  queryClient: ReturnType<typeof useQueryClient>,
  tableSlug: string,
  response: IField,
): void {
  queryClient.setQueryData<IField>(
    queryKeys.fields.detail(tableSlug, response._id),
    response,
  );

  queryClient.setQueryData<ITable>(
    queryKeys.tables.detail(tableSlug),
    (old) => {
      if (!old) return old;
      return {
        ...old,
        fields: old.fields.map((f) => {
          if (f._id === response._id) return response;
          return f;
        }),
      };
    },
  );

  queryClient.setQueryData<Paginated<ITable>>(
    queryKeys.tables.list({ page: 1, perPage: 50 }),
    (old) => {
      if (!old) return old;
      return {
        meta: old.meta,
        data: old.data.map((t) => {
          if (t.slug !== tableSlug) return t;
          return {
            ...t,
            fields: t.fields.map((f) => {
              if (f._id === response._id) return response;
              return f;
            }),
          };
        }),
      };
    },
  );
}

export function useTableFieldManagement(
  table: ITable | undefined,
): FieldManagementActions {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [togglingFieldId, setTogglingFieldId] = useState<string | null>(null);
  const [changingWidthFieldId, setChangingWidthFieldId] = useState<
    string | null
  >(null);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const [restoringFieldId, setRestoringFieldId] = useState<string | null>(null);

  const tableSlug = table?.slug ?? '';
  const fields = table?.fields ?? [];

  // Índice campo-filho -> slug do grupo dono, e lista de filhos elegíveis a
  // aparecer na aba Lista (config `showInParentList`). A visibilidade da coluna
  // na lista principal é `visibleInParentList`, alternada aqui pelo endpoint do
  // grupo (`/tables/:slug/groups/:groupSlug/fields/:id`).
  const parentGroupSlugByChildId = new Map<string, string>();
  const parentListChildFields: Array<IField> = [];
  for (const group of table?.groups ?? []) {
    for (const childField of group.fields ?? []) {
      parentGroupSlugByChildId.set(childField._id, group.slug);
      if (childField.showInParentList && !childField.trashed) {
        parentListChildFields.push(childField);
      }
    }
  }
  const parentListChildIds = new Set(parentListChildFields.map((f) => f._id));

  async function putGroupChildField(
    field: IField,
    overrides: Partial<IField>,
  ): Promise<IField> {
    const groupSlug = parentGroupSlugByChildId.get(field._id) ?? '';
    const route = `/tables/${tableSlug}/groups/${groupSlug}/fields/${field._id}`;
    const response = await API.put<IField>(
      route,
      buildFieldPayload(field, overrides),
    );
    return response.data;
  }

  const updateTable = useUpdateTable({
    onSuccess: () => {
      toast.success('Ordem atualizada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar ordem dos campos');
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({
      field,
      visibilityKey,
      newValue,
    }: {
      field: IField;
      visibilityKey: VisibilityKey;
      newValue: boolean;
    }) => {
      const route = `/tables/${tableSlug}/fields/${field._id}`;
      const response = await API.put<IField>(
        route,
        buildFieldPayload(
          field,
          buildVisibilityOverride(field, visibilityKey, newValue),
        ),
      );
      return { data: response.data, visibilityKey };
    },
    onMutate: ({ field }) => {
      setTogglingFieldId(field._id);
    },
    onSuccess: ({ data: response, visibilityKey }) => {
      updateFieldInTableCache(queryClient, tableSlug, response);
      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(tableSlug),
      });
      const label = VISIBILITY_LABELS[visibilityKey];
      let shown = Boolean(response.showInFilter);
      const context = CONTEXT_BY_VISIBILITY_KEY[visibilityKey];
      if (context) {
        shown = isFieldShownInContext(response, context);
      }
      if (shown) {
        toast.success(`Campo visível em ${label}`);
      } else {
        toast.success(`Campo oculto em ${label}`);
      }
    },
    onError: () => {
      toast.error('Erro ao atualizar visibilidade do campo');
    },
    onSettled: () => {
      setTogglingFieldId(null);
    },
  });

  const changeWidthMutation = useMutation({
    mutationFn: async ({
      field,
      widthKey,
      newWidth,
    }: {
      field: IField;
      widthKey: WidthKey;
      newWidth: number;
    }) => {
      const route = `/tables/${tableSlug}/fields/${field._id}`;
      const response = await API.put<IField>(
        route,
        buildFieldPayload(field, { [widthKey]: newWidth }),
      );
      return { data: response.data, widthKey };
    },
    onMutate: ({ field }) => {
      setChangingWidthFieldId(field._id);
    },
    onSuccess: ({ data: response, widthKey }) => {
      updateFieldInTableCache(queryClient, tableSlug, response);
      let unit = '%';
      if (widthKey === 'widthInList') {
        unit = 'px';
      }
      toast.success(`Largura atualizada para ${response[widthKey]}${unit}`);
    },
    onError: () => {
      toast.error('Erro ao atualizar largura do campo');
    },
    onSettled: () => {
      setChangingWidthFieldId(null);
    },
  });

  // Toggle de visibilidade da coluna na lista principal para campo-filho de
  // grupo: persiste `visibleInParentList` via endpoint do grupo.
  const toggleParentListMutation = useMutation({
    mutationFn: async ({
      field,
      newValue,
    }: {
      field: IField;
      newValue: boolean;
    }) => putGroupChildField(field, { visibleInParentList: newValue }),
    onMutate: ({ field }) => {
      setTogglingFieldId(field._id);
    },
    onSuccess: (_response, { newValue }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(tableSlug),
      });
      if (newValue) {
        toast.success('Campo visível em listagem');
      } else {
        toast.success('Campo oculto em listagem');
      }
    },
    onError: () => {
      toast.error('Erro ao atualizar visibilidade do campo');
    },
    onSettled: () => {
      setTogglingFieldId(null);
    },
  });

  const changeParentListWidthMutation = useMutation({
    mutationFn: async ({
      field,
      newWidth,
    }: {
      field: IField;
      newWidth: number;
    }) => putGroupChildField(field, { widthInList: newWidth }),
    onMutate: ({ field }) => {
      setChangingWidthFieldId(field._id);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(tableSlug),
      });
      toast.success(`Largura atualizada para ${response.widthInList}px`);
    },
    onError: () => {
      toast.error('Erro ao atualizar largura do campo');
    },
    onSettled: () => {
      setChangingWidthFieldId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (field: IField) => {
      const route = `/tables/${tableSlug}/fields/${field._id}`;
      await API.delete(route);
      return field;
    },
    onMutate: (field) => {
      setDeletingFieldId(field._id);
    },
    onSuccess: (field) => {
      queryClient.setQueryData<ITable>(
        queryKeys.tables.detail(tableSlug),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            fields: old.fields.filter((f) => f._id !== field._id),
          };
        },
      );

      queryClient.setQueryData<Paginated<ITable>>(
        queryKeys.tables.list({ page: 1, perPage: 50 }),
        (old) => {
          if (!old) return old;
          return {
            meta: old.meta,
            data: old.data.map((t) => {
              if (t.slug !== tableSlug) return t;
              return {
                ...t,
                fields: t.fields.filter((f) => f._id !== field._id),
              };
            }),
          };
        },
      );

      toast.success(
        `Campo "${resolveFieldLabel(field)}" excluído permanentemente`,
      );
    },
    onError: (error) => {
      console.error(error);
      toast.error('Erro ao excluir campo', {
        description:
          'Não foi possível excluir o campo permanentemente. Tente novamente.',
      });
    },
    onSettled: () => {
      setDeletingFieldId(null);
    },
  });

  function onToggleVisibility(
    field: IField,
    visibilityKey: VisibilityKey,
    newValue: boolean,
  ): void {
    if (visibilityKey === 'showInList' && parentListChildIds.has(field._id)) {
      toggleParentListMutation.mutate({ field, newValue });
      return;
    }
    toggleVisibilityMutation.mutate({ field, visibilityKey, newValue });
  }

  function onChangeWidth(
    field: IField,
    widthKey: WidthKey,
    newWidth: number,
  ): void {
    if (widthKey === 'widthInList' && parentListChildIds.has(field._id)) {
      changeParentListWidthMutation.mutate({ field, newWidth });
      return;
    }
    changeWidthMutation.mutate({ field, widthKey, newWidth });
  }

  function onSaveOrder(
    visibilityKey: VisibilityKey,
    orderedFieldIds: Array<string>,
  ): void {
    if (!table) return;

    const orderPayload = {
      fieldOrderList: table.fieldOrderList,
      fieldOrderForm: table.fieldOrderForm,
      fieldOrderFilter: table.fieldOrderFilter,
      fieldOrderDetail: table.fieldOrderDetail,
    };

    orderPayload[ORDER_FIELD_KEY_BY_VISIBILITY[visibilityKey]] =
      orderedFieldIds;

    updateTable.mutate({
      routeSlug: table.slug,
      name: table.name,
      description: table.description,
      logo: table.logo?._id ?? null,
      style: table.style,
      ...orderPayload,
      fields: table.fields.flatMap((f) => f._id),
      methods: {
        ...table.methods,
        afterSave: table.methods.afterSave,
        beforeSave: table.methods.beforeSave,
        onLoad: table.methods.onLoad,
      },
    });
  }

  const restoreMutation = useMutation({
    mutationFn: async (field: IField) => {
      const route = `/tables/${tableSlug}/fields/${field._id}/restore`;
      const response = await API.patch<IField>(route);
      return response.data;
    },
    onMutate: (field) => {
      setRestoringFieldId(field._id);
    },
    onSuccess: (response) => {
      updateFieldInTableCache(queryClient, tableSlug, response);
      toast.success('Campo restaurado', {
        description: 'O campo foi restaurado da lixeira com sucesso.',
      });
    },
    onError: () => {
      toast.error('Erro ao restaurar campo', {
        description:
          'Não foi possível restaurar o campo da lixeira. Tente novamente.',
      });
    },
    onSettled: () => {
      setRestoringFieldId(null);
    },
  });

  function onDeleteField(field: IField): void {
    deleteMutation.mutate(field);
  }

  function onRestoreField(field: IField): void {
    restoreMutation.mutate(field);
  }

  function onEditField(fieldId: string): void {
    let search: { group?: string } = {};
    const groupSlug = parentGroupSlugByChildId.get(fieldId);
    if (groupSlug && parentListChildIds.has(fieldId)) {
      search = { group: groupSlug };
    }
    router.navigate({
      to: '/tables/$slug/field/$fieldId',
      params: { slug: tableSlug, fieldId },
      search,
    });
  }

  return {
    fields,
    parentListChildFields,
    parentListChildIds,
    fieldOrderList: table?.fieldOrderList ?? [],
    fieldOrderForm: table?.fieldOrderForm ?? [],
    fieldOrderFilter: table?.fieldOrderFilter ?? [],
    fieldOrderDetail: table?.fieldOrderDetail ?? [],
    onToggleVisibility,
    onChangeWidth,
    onSaveOrder,
    onDeleteField,
    onRestoreField,
    onEditField,
    togglingFieldId,
    changingWidthFieldId,
    deletingFieldId,
    restoringFieldId,
    isSavingOrder: updateTable.isPending,
  };
}
