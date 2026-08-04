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
import { useGroupFieldUpdate } from '@/hooks/tanstack-query/use-group-field-update';
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
import { resolveFieldLabel } from '@/lib/table';

// Chave do toggle -> contexto do binding. `showInFilter` não é permissão.
const CONTEXT_BY_VISIBILITY_KEY: Partial<Record<VisibilityKey, FieldContext>> =
  {
    showInList: 'list',
    showInForm: 'form',
    showInDetail: 'detail',
  };

// Traduz o toggle mostrar/ocultar para o override do payload: `showInFilter`
// booleano; list/form/detail viram binding PUBLIC/NOBODY em `permissions`.
function buildVisibilityOverride(
  field: IField,
  visibilityKey: VisibilityKey,
  newValue: boolean,
): Partial<IField> {
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

function buildGroupFieldPayload(
  field: IField,
  groupSlug: string,
  groupId: string | undefined,
  overrides: Partial<IField>,
): Partial<IField> {
  const dropdown = field.dropdown ?? [];
  const category = field.category ?? [];

  let relationship = null;
  if (field.relationship) {
    relationship = {
      table: {
        _id: field.relationship.table._id,
        slug: field.relationship.table.slug,
      },
      field: {
        _id: field.relationship.field._id,
        slug: field.relationship.field.slug,
      },
      order: field.relationship.order,
      relationshipId: field.relationship.relationshipId ?? null,
      side: field.relationship.side ?? null,
      formMode: field.relationship.formMode,
      visible: field.relationship.visible,
      onDelete: field.relationship.onDelete,
      mirror: field.relationship.mirror,
      max: field.relationship.max ?? null,
    };
  }

  const groupEntry: { slug: string; _id?: string } = { slug: groupSlug };
  if (groupId) {
    groupEntry._id = groupId;
  }

  return {
    name: field.name,
    type: field.type,
    required: field.required,
    multiple: field.multiple,
    showInFilter: field.showInFilter,
    permissions: field.permissions ?? null,
    widthInForm: field.widthInForm ?? 50,
    widthInList: field.widthInList ?? 10,
    widthInDetail: field.widthInDetail ?? 50,
    format: field.format ?? null,
    defaultValue: field.defaultValue ?? null,
    dropdown,
    relationship,
    group: groupEntry,
    category,
    trashed: field.trashed,
    trashedAt: field.trashedAt ?? null,
    ...overrides,
  };
}

export function useGroupFieldManagement(
  table: ITable | undefined,
  groupSlug: string,
): FieldManagementActions {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [togglingFieldId, setTogglingFieldId] = useState<string | null>(null);
  const [changingWidthFieldId, setChangingWidthFieldId] = useState<
    string | null
  >(null);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const [restoringFieldId, setRestoringFieldId] = useState<string | null>(null);
  const [pendingWidthKey, setPendingWidthKey] = useState<WidthKey | null>(null);

  const tableSlug = table?.slug ?? '';
  const targetGroup = (table?.groups ?? []).find((g) => g.slug === groupSlug);
  const fields = targetGroup?.fields ?? [];

  const updateTable = useUpdateTable({
    onSuccess: () => {
      toast.success('Ordem atualizada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar ordem dos campos');
    },
  });

  const groupFieldUpdate = useGroupFieldUpdate({
    onSuccess: (response) => {
      if (pendingWidthKey) {
        const widthValue = response[pendingWidthKey] ?? 'N/A';
        let unit = '%';
        if (pendingWidthKey === 'widthInList') {
          unit = 'px';
        }
        toast.success(`Largura atualizada para ${widthValue}${unit}`);
      } else if (togglingFieldId) {
        // Determine which visibility key was toggled by checking context
        // The toast is generic here since we don't track the key in this callback
        toast.success('Campo atualizado com sucesso');
      }
      setTogglingFieldId(null);
      setChangingWidthFieldId(null);
      setPendingWidthKey(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar campo do grupo');
      setTogglingFieldId(null);
      setChangingWidthFieldId(null);
      setPendingWidthKey(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (field: IField) => {
      const route = `/tables/${tableSlug}/fields/${field._id}?group=${groupSlug}`;
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
            groups: old.groups.map((g) => {
              if (g.slug !== groupSlug) return g;
              return {
                ...g,
                fields: g.fields.filter((f) => f._id !== field._id),
              };
            }),
          };
        },
      );

      queryClient.setQueriesData<Paginated<ITable>>(
        { queryKey: queryKeys.tables.lists() },
        (old) => {
          if (!old) return old;
          return {
            meta: old.meta,
            data: old.data.map((t) => {
              if (t.slug !== tableSlug) return t;
              return {
                ...t,
                groups: t.groups.map((g) => {
                  if (g.slug !== groupSlug) return g;
                  return {
                    ...g,
                    fields: g.fields.filter((f) => f._id !== field._id),
                  };
                }),
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
    setTogglingFieldId(field._id);
    setPendingWidthKey(null);
    groupFieldUpdate.mutate({
      tableSlug,
      groupSlug,
      fieldId: field._id,
      data: buildGroupFieldPayload(
        field,
        groupSlug,
        targetGroup?._id,
        buildVisibilityOverride(field, visibilityKey, newValue),
      ),
    });
  }

  function onChangeWidth(
    field: IField,
    widthKey: WidthKey,
    newWidth: number,
  ): void {
    setChangingWidthFieldId(field._id);
    setPendingWidthKey(widthKey);
    groupFieldUpdate.mutate({
      tableSlug,
      groupSlug,
      fieldId: field._id,
      data: buildGroupFieldPayload(field, groupSlug, targetGroup?._id, {
        [widthKey]: newWidth,
      }),
    });
  }

  function onSaveOrder(
    _visibilityKey: VisibilityKey,
    orderedFieldIds: Array<string>,
  ): void {
    if (!table) return;

    const updatedGroups = table.groups.map((g) => {
      if (g.slug === groupSlug) {
        const trashedFields = g.fields.filter((f) => f.trashed);
        const orderedFields = orderedFieldIds.map((id) => ({ _id: id }));
        const trashedFieldRefs = trashedFields.map((f) => ({ _id: f._id }));
        return {
          ...g,
          fields: [...orderedFields, ...trashedFieldRefs],
        };
      }
      return g;
    });

    updateTable.mutate({
      routeSlug: table.slug,
      name: table.name,
      description: table.description,
      logo: table.logo?._id ?? null,
      style: table.style,
      fieldOrderList: table.fieldOrderList,
      fieldOrderForm: table.fieldOrderForm,
      fieldOrderFilter: table.fieldOrderFilter,
      fieldOrderDetail: table.fieldOrderDetail,
      groups: updatedGroups,
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
      const route = `/tables/${tableSlug}/groups/${groupSlug}/fields/${field._id}/restore`;
      const response = await API.patch<IField>(route);
      return response.data;
    },
    onMutate: (field) => {
      setRestoringFieldId(field._id);
    },
    onSuccess: (response) => {
      queryClient.setQueryData<ITable>(
        queryKeys.tables.detail(tableSlug),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            groups: old.groups.map((g) => {
              if (g.slug !== groupSlug) return g;
              return {
                ...g,
                fields: g.fields.map((f) => {
                  if (f._id === response._id) return response;
                  return f;
                }),
              };
            }),
          };
        },
      );

      queryClient.setQueriesData<Paginated<ITable>>(
        { queryKey: queryKeys.tables.lists() },
        (old) => {
          if (!old) return old;
          return {
            meta: old.meta,
            data: old.data.map((t) => {
              if (t.slug !== tableSlug) return t;
              return {
                ...t,
                groups: t.groups.map((g) => {
                  if (g.slug !== groupSlug) return g;
                  return {
                    ...g,
                    fields: g.fields.map((f) => {
                      if (f._id === response._id) return response;
                      return f;
                    }),
                  };
                }),
              };
            }),
          };
        },
      );

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
    router.navigate({
      to: '/tables/$slug/field/$fieldId',
      params: { slug: tableSlug, fieldId },
      search: { group: groupSlug },
    });
  }

  return {
    fields,
    // Gerenciamento DENTRO de um grupo não injeta campos-filho na listagem geral
    // da tabela pai — isso só vale no gerenciamento da própria tabela.
    parentListChildFields: [],
    parentListChildIds: new Set<string>(),
    fieldOrderList: [],
    fieldOrderForm: [],
    fieldOrderFilter: [],
    fieldOrderDetail: [],
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
