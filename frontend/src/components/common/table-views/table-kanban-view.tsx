import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { PlusIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import {
  KanbanAddListDialog,
  KanbanCard,
  KanbanColumn,
  KanbanCreateCardDialog,
  KanbanRowDialog,
  KanbanSortableCard,
  KanbanUnassignedColumn,
} from '@/components/common/dynamic-table/kanban';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useCreateTableRow } from '@/hooks/tanstack-query/use-table-row-create';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { API } from '@/lib/api';
import { E_FIELD_FORMAT, E_FIELD_TYPE } from '@/lib/constant';
import type { IField, IRow, ITable } from '@/lib/interfaces';
import {
  ORDER_FIELD_NAME,
  ORDER_FIELD_SLUG,
  SORTABLE_FIELD_TYPES,
  TEMPLATE_FIELD_SLUGS,
  buildListFieldPayload,
  compareRowsByField,
  getFieldBySlug,
  getFirstFieldByType,
  normalizeRowValue,
  parseOrderValue,
} from '@/lib/kanban-helpers';
import type { FieldMap } from '@/lib/kanban-types';
import { buildFieldPermissions } from '@/lib/permission';
import {
  buildDefaultValues,
  buildPayload,
} from '@/routes/_private/tables/$slug/row/create/-create-form';
import { useAuthStore } from '@/stores/authentication';

type Props = {
  data: Array<IRow>;
  headers: Array<IField>;
  tableSlug: string;
  table: ITable;
};

export function TableKanbanView({
  data,
  headers,
  tableSlug,
  table,
}: Props): React.JSX.Element {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?._id) ?? '';
  const [activeRow, setActiveRow] = React.useState<IRow | null>(null);
  const activeRowId = activeRow?._id ?? null;
  const [isAddListOpen, setIsAddListOpen] = React.useState(false);
  const [rowsState, setRowsState] = React.useState<Array<IRow>>(data);
  const [isCreateCardOpen, setIsCreateCardOpen] = React.useState(false);
  const [createColumnId, setCreateColumnId] = React.useState<string | null>(
    null,
  );
  const [activeDragCardId, setActiveDragCardId] = React.useState<string | null>(
    null,
  );
  const [rowEditTarget, setRowEditTarget] = React.useState<
    'members' | 'start' | 'due' | 'list' | null
  >(null);
  const startDateEnsureAttemptedRef = React.useRef(false);

  const fields = React.useMemo<FieldMap>(() => {
    const listField =
      getFieldBySlug(headers, 'lista', E_FIELD_TYPE.DROPDOWN) ||
      getFirstFieldByType(headers, E_FIELD_TYPE.DROPDOWN);

    return {
      title:
        getFieldBySlug(headers, 'titulo', E_FIELD_TYPE.TEXT_SHORT) ||
        getFirstFieldByType(headers, E_FIELD_TYPE.TEXT_SHORT),
      description: getFieldBySlug(headers, 'descricao', E_FIELD_TYPE.TEXT_LONG),
      members: getFieldBySlug(headers, 'membros', E_FIELD_TYPE.USER),
      startDate: getFieldBySlug(headers, 'data-de-inicio', E_FIELD_TYPE.DATE),
      dueDate: getFieldBySlug(headers, 'data-de-vencimento', E_FIELD_TYPE.DATE),
      progress: getFieldBySlug(
        headers,
        'porcentagem-concluida',
        E_FIELD_TYPE.TEXT_SHORT,
      ),
      list: listField,
      // Hide labels until dedicated "etiqueta" field type is available.
      labels: undefined,
      attachments:
        getFieldBySlug(headers, 'anexos', E_FIELD_TYPE.FIELD_GROUP) ||
        getFieldBySlug(headers, 'anexo', E_FIELD_TYPE.FILE),
      tasks: getFieldBySlug(headers, 'tarefas', E_FIELD_TYPE.FIELD_GROUP),
      comments: getFieldBySlug(
        headers,
        'comentarios',
        E_FIELD_TYPE.FIELD_GROUP,
      ),
    };
  }, [headers]);

  const listOptions = fields.list?.dropdown ?? [];
  const orderField = React.useMemo(
    () =>
      headers.find(
        (field) => !field.trashed && field.slug === ORDER_FIELD_SLUG,
      ),
    [headers],
  );
  const [orderFieldSlug, setOrderFieldSlug] = React.useState<string | null>(
    orderField?.slug ?? null,
  );

  const [columnOrder, setColumnOrder] = React.useState<Array<string>>(
    listOptions.map((opt) => opt.id),
  );

  React.useEffect(() => {
    setRowsState(data);
  }, [data]);

  React.useEffect(() => {
    setColumnOrder((prev) => {
      const ids = listOptions.map((opt) => opt.id);
      if (prev.length === 0) return ids;
      const next = prev.filter((id) => ids.includes(id));
      ids.forEach((id) => {
        if (!next.includes(id)) next.push(id);
      });
      return next;
    });
  }, [listOptions]);

  React.useEffect(() => {
    setOrderFieldSlug(orderField?.slug ?? null);
  }, [orderField?.slug]);

  const orderedListOptions = React.useMemo(() => {
    const byId = new Map(listOptions.map((opt) => [opt.id, opt] as const));
    return columnOrder
      .map((id) => byId.get(id))
      .filter((opt): opt is (typeof listOptions)[number] => opt !== undefined);
  }, [columnOrder, listOptions]);

  const activeFields = React.useMemo(
    () => headers.filter((field) => !field.trashed && !field.native),
    [headers],
  );
  // Campos disponíveis para ordenar os cards de uma lista (exclui o campo de
  // lista e o campo interno de ordem manual do Kanban).
  const sortFieldOptions = React.useMemo(
    () =>
      activeFields
        .filter(
          (field) =>
            field.slug !== ORDER_FIELD_SLUG &&
            field.slug !== fields.list?.slug &&
            SORTABLE_FIELD_TYPES.has(field.type),
        )
        .map((field) => ({ label: field.name, value: field.slug })),
    [activeFields, fields.list?.slug],
  );
  const createDialogExtraFields = React.useMemo(() => {
    return table.fields.filter(
      (field) =>
        !field.trashed &&
        !field.native &&
        !TEMPLATE_FIELD_SLUGS.has(field.slug) &&
        field.slug !== fields.attachments?.slug &&
        field.slug !== ORDER_FIELD_SLUG &&
        field.type !== E_FIELD_TYPE.REACTION &&
        field.type !== E_FIELD_TYPE.EVALUATION,
    );
  }, [fields, table.fields]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const addListOption = useMutation({
    mutationFn: async (payload: { label: string; color?: string | null }) => {
      if (!fields.list) {
        throw new Error('Campo de lista não encontrado');
      }
      const route = '/tables/'
        .concat(tableSlug)
        .concat('/fields/')
        .concat(fields.list._id);
      const dropdown = [
        ...fields.list.dropdown,
        {
          id: crypto.randomUUID(),
          label: payload.label,
          color: payload.color ?? null,
        },
      ];
      const response = await API.put<IField>(
        route,
        buildListFieldPayload(fields.list, dropdown),
      );
      return response.data;
    },
    onSuccess(updatedField) {
      queryClient.setQueryData<ITable>(
        queryKeys.tables.detail(tableSlug),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            fields: old.fields.map((field) => {
              if (field._id === updatedField._id) return updatedField;
              return field;
            }),
          };
        },
      );
      toast.success('Lista adicionada', {
        description: 'A nova coluna foi criada com sucesso',
      });
      setIsAddListOpen(false);
    },
    onError() {
      toast.error('Erro ao adicionar lista', {
        description: 'Nao foi possivel criar a coluna',
      });
    },
  });

  const addListForm = useAppForm({
    defaultValues: {
      label: '',
      color: '#a3a3a3',
    },
    onSubmit: async ({ value }) => {
      const label = value.label.trim();
      if (!label || addListOption.status === 'pending') return;
      await addListOption.mutateAsync({
        label,
        color: value.color,
      });
    },
  });

  React.useEffect(() => {
    if (isAddListOpen) return;
    addListForm.reset({
      label: '',
      color: '#a3a3a3',
    });
  }, [addListForm, isAddListOpen]);

  const updateListOption = useMutation({
    mutationFn: async (payload: {
      optionId: string;
      label: string;
      color: string | null;
      sortField: string | null;
      sortDirection: 'asc' | 'desc' | null;
    }) => {
      if (!fields.list) {
        throw new Error('Campo de lista não encontrado');
      }
      const dropdown = fields.list.dropdown.map((opt) => {
        if (opt.id !== payload.optionId) return opt;
        return {
          ...opt,
          label: payload.label,
          color: payload.color,
          sortField: payload.sortField,
          sortDirection: payload.sortDirection,
        };
      });
      const response = await API.put<IField>(
        '/tables/'.concat(tableSlug).concat('/fields/').concat(fields.list._id),
        buildListFieldPayload(fields.list, dropdown),
      );
      return response.data;
    },
    onSuccess(updatedField) {
      queryClient.setQueryData<ITable>(
        queryKeys.tables.detail(tableSlug),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            fields: old.fields.map((field) => {
              if (field._id === updatedField._id) return updatedField;
              return field;
            }),
          };
        },
      );
      toast.success('Lista atualizada', {
        description: 'A lista foi atualizada',
      });
    },
    onError() {
      toast.error('Erro ao atualizar lista', {
        description: 'Nao foi possivel atualizar a lista',
      });
    },
  });

  const columns = React.useMemo(() => {
    const byStatus: Record<string, Array<IRow>> = {};
    orderedListOptions.forEach((opt) => {
      byStatus[opt.id] = [];
    });
    const unassigned: Array<IRow> = [];

    const rowOrderIndex = new Map(
      rowsState.map((row, index) => [row._id, index]),
    );

    rowsState.forEach((row) => {
      let raw = null;
      if (fields.list) raw = row[fields.list.slug];
      const values = normalizeRowValue(raw);
      const value = values[0];
      if (value && value in byStatus) {
        byStatus[value].push(row);
      } else {
        unassigned.push(row);
      }
    });

    const optionById = new Map(
      orderedListOptions.map((opt) => [opt.id, opt] as const),
    );

    const sortByManualOrder = (rows: Array<IRow>): void => {
      if (!orderFieldSlug) return;
      rows.sort((a, b) => {
        const aOrder = parseOrderValue(a[orderFieldSlug]);
        const bOrder = parseOrderValue(b[orderFieldSlug]);
        if (aOrder === null && bOrder === null) {
          return (
            (rowOrderIndex.get(a._id) ?? 0) - (rowOrderIndex.get(b._id) ?? 0)
          );
        }
        if (aOrder === null) return 1;
        if (bOrder === null) return -1;
        return aOrder - bOrder;
      });
    };

    Object.keys(byStatus).forEach((key) => {
      const option = optionById.get(key);
      const sortField = option?.sortField;
      // Ordenação por campo configurada na lista tem prioridade sobre a ordem
      // manual de drag-drop. Se o campo configurado foi removido, cai na ordem
      // manual.
      if (sortField) {
        const field = getFieldBySlug(activeFields, sortField);
        if (field) {
          let direction: 'asc' | 'desc' = 'asc';
          if (option?.sortDirection === 'desc') direction = 'desc';
          byStatus[key].sort((a, b) =>
            compareRowsByField(a, b, field, direction),
          );
          return;
        }
      }
      sortByManualOrder(byStatus[key]);
    });

    return {
      byStatus,
      unassigned,
    };
  }, [
    activeFields,
    fields.list,
    orderedListOptions,
    orderFieldSlug,
    rowsState,
  ]);

  React.useEffect(() => {
    if (!activeRowId) return;
    const updated = rowsState.find((row) => row._id === activeRowId);
    if (updated) setActiveRow(updated);
  }, [rowsState, activeRowId]);

  // Deep-link: ?rowId=... abre o card automaticamente.
  // Usado pelas notificações de membro/menção/comentário.
  const searchParams = useRouterState({ select: (s) => s.location.search });
  const deepLinkRowIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    let rowIdParam: unknown;
    if (
      typeof searchParams === 'object' &&
      searchParams !== null &&
      'rowId' in searchParams
    ) {
      rowIdParam = searchParams.rowId;
    }
    if (typeof rowIdParam !== 'string' || !rowIdParam) return;
    if (deepLinkRowIdRef.current === rowIdParam) return;
    const target = rowsState.find((row) => row._id === rowIdParam);
    if (!target) return;
    deepLinkRowIdRef.current = rowIdParam;
    setActiveRow(target);
  }, [searchParams, rowsState]);

  const createRow = useCreateTableRow({
    onSuccess(createdRow) {
      setRowsState((prev) => [...prev, createdRow]);
      toast.success('Card criado', {
        description: 'O card foi criado com sucesso',
      });
      setIsCreateCardOpen(false);
      setCreateColumnId(null);
    },
    onError() {
      toast.error('Erro ao criar card', {
        description: 'Nao foi possivel criar o card',
      });
    },
  });

  React.useEffect(() => {
    if (fields.startDate) return;
    if (startDateEnsureAttemptedRef.current) return;
    startDateEnsureAttemptedRef.current = true;

    void API.post<IField>('/tables/'.concat(tableSlug).concat('/fields'), {
      name: 'Data de início',
      type: E_FIELD_TYPE.DATE,
      required: false,
      multiple: false,
      format: E_FIELD_FORMAT.DD_MM_YYYY,
      showInFilter: true,
      permissions: buildFieldPermissions(true, true, true),
      defaultValue: null,
      locked: true,
      relationship: null,
      dropdown: [],
      category: [],
      group: null,
    })
      .then((createdField) => {
        queryClient.setQueryData<ITable>(
          queryKeys.tables.detail(tableSlug),
          (old) => {
            if (!old) return old;
            if (old.fields.some((field) => field._id === createdField.data._id))
              return old;
            return {
              ...old,
              fields: [...old.fields, createdField.data],
            };
          },
        );
        toast.success('Campo Data de início criado', {
          description: 'Kanban atualizado com o novo campo de início',
        });
      })
      .catch(() => {
        toast.error('Erro ao criar Data de início', {
          description: 'Nao foi possivel adicionar o campo no Kanban',
        });
      });
  }, [fields.startDate, queryClient, tableSlug]);

  const createForm = useAppForm({
    defaultValues: buildDefaultValues(activeFields),
    onSubmit: async ({ value }) => {
      if (!fields.list || !createColumnId) return;
      if (createRow.status === 'pending') return;

      const payload = buildPayload(value, activeFields);
      payload[fields.list.slug] = [createColumnId];

      // Auto-fill autor/data in attachment group items
      if (
        fields.attachments?.type === E_FIELD_TYPE.FIELD_GROUP &&
        Array.isArray(payload[fields.attachments.slug])
      ) {
        payload[fields.attachments.slug] = payload[fields.attachments.slug].map(
          (item: Record<string, unknown>) => {
            let autor: Array<string> = [];
            if (currentUserId) autor = [currentUserId];
            return { ...item, autor, data: new Date().toISOString() };
          },
        );
      }

      if (orderFieldSlug) {
        const columnCount = columns.byStatus[createColumnId].length;
        payload[orderFieldSlug] = String(columnCount + 1);
      }

      await createRow.mutateAsync({
        slug: tableSlug,
        data: payload,
      });
    },
  });

  const createColumnOption = orderedListOptions.find(
    (option) => option.id === createColumnId,
  );
  const activeDragCard = rowsState.find((row) => row._id === activeDragCardId);

  const handleRowDuplicated = React.useCallback(
    (createdRow: IRow) => {
      setRowsState((prev) => [...prev, createdRow]);
      setActiveRow(createdRow);
      queryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(tableSlug),
      });
    },
    [queryClient, tableSlug],
  );

  const handleRowDeleted = React.useCallback(
    (rowId: string) => {
      setRowsState((prev) => prev.filter((row) => row._id !== rowId));
      setActiveRow((prev) => {
        if (prev && prev._id === rowId) return null;
        return prev;
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(tableSlug),
      });
    },
    [queryClient, tableSlug],
  );

  React.useEffect(() => {
    if (!isCreateCardOpen) return;
    createForm.reset(buildDefaultValues(activeFields));
    if (fields.list && createColumnId) {
      createForm.setFieldValue(fields.list.slug, [createColumnId]);
    }
  }, [activeFields, createColumnId, createForm, fields.list, isCreateCardOpen]);

  // Auto-preenche o Título a partir do item escolhido num campo de origem
  // (Chamado / Caso de Uso / Caso de Teste / qualquer relacionamento). O valor
  // selecionado guarda { value, label }, onde label é o nome do item.
  const relationshipFieldSlugs = React.useMemo(
    () =>
      createDialogExtraFields
        .filter((field) => field.type === E_FIELD_TYPE.RELATIONSHIP)
        .map((field) => field.slug),
    [createDialogExtraFields],
  );

  // Nome do primeiro relacionamento selecionado, candidato a semear o título.
  const relationshipSeedLabel = useStore(createForm.store, (state) => {
    const values: Record<string, unknown> = state.values;
    for (const slug of relationshipFieldSlugs) {
      const value = values[slug];
      if (Array.isArray(value) && value.length > 0) {
        const first: { label?: unknown } = value[0];
        const label = first.label;
        if (typeof label === 'string' && label.trim()) return label.trim();
      }
    }
    return '';
  });

  React.useEffect(() => {
    if (!isCreateCardOpen || !fields.title || !relationshipSeedLabel) return;
    const titleSlug = fields.title.slug;
    const values: Record<string, unknown> = createForm.store.state.values;
    const currentTitle = String(values[titleSlug] ?? '').trim();
    // Só preenche quando vazio; se já houver texto, não sobrescreve.
    if (currentTitle) return;
    createForm.setFieldValue(titleSlug, relationshipSeedLabel);
  }, [createForm, fields.title, isCreateCardOpen, relationshipSeedLabel]);

  const ensureOrderField = React.useCallback(async (): Promise<
    string | null
  > => {
    if (orderField?.slug) {
      if (!orderField.locked) {
        try {
          const response = await API.put<IField>(
            '/tables/'
              .concat(tableSlug)
              .concat('/fields/')
              .concat(orderField._id),
            {
              ...orderField,
              locked: true,
            },
          );
          const updatedField = response.data;
          queryClient.setQueryData<ITable>(
            queryKeys.tables.detail(tableSlug),
            (old) => {
              if (!old) return old;
              return {
                ...old,
                fields: old.fields.map((field) => {
                  if (field._id === updatedField._id) return updatedField;
                  return field;
                }),
              };
            },
          );
        } catch (error) {
          toast.error('Erro ao travar o campo de ordem', {
            description: 'Nao foi possivel travar o campo de ordem',
          });
        }
      }
      return orderField.slug;
    }
    if (orderFieldSlug) return orderFieldSlug;
    try {
      const response = await API.post<IField>(
        '/tables/'.concat(tableSlug).concat('/fields'),
        {
          name: ORDER_FIELD_NAME,
          type: E_FIELD_TYPE.TEXT_SHORT,
          required: false,
          multiple: false,
          format: E_FIELD_FORMAT.INTEGER,
          showInFilter: false,
          permissions: buildFieldPermissions(false, false, false),
          defaultValue: null,
          locked: true,
          relationship: null,
          dropdown: [],
          category: [],
          group: null,
        },
      );

      const createdField = response.data;
      setOrderFieldSlug(createdField.slug);
      queryClient.setQueryData<ITable>(
        queryKeys.tables.detail(tableSlug),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            fields: [...old.fields, createdField],
          };
        },
      );

      setRowsState((prev) =>
        prev.map((row) => ({ ...row, [createdField.slug]: null })),
      );

      return createdField.slug;
    } catch (error) {
      toast.error('Erro ao preparar ordenação', {
        description: 'Nao foi possivel criar o campo de ordem',
      });
      return null;
    }
  }, [orderField, orderFieldSlug, queryClient, tableSlug]);

  const updateListDropdownOrder = React.useCallback(
    async (nextOrder: Array<string>) => {
      if (!fields.list) return;
      const byId = new Map(
        fields.list.dropdown.map((opt) => [opt.id, opt] as const),
      );
      const nextDropdown = nextOrder.map((id) => byId.get(id)).filter(Boolean);
      try {
        const response = await API.put<IField>(
          '/tables/'
            .concat(tableSlug)
            .concat('/fields/')
            .concat(fields.list._id),
          {
            ...fields.list,
            dropdown: nextDropdown,
          },
        );
        const updatedField = response.data;
        queryClient.setQueryData<ITable>(
          queryKeys.tables.detail(tableSlug),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              fields: old.fields.map((field) => {
                if (field._id === updatedField._id) return updatedField;
                return field;
              }),
            };
          },
        );
      } catch (error) {
        toast.error('Erro ao ordenar colunas', {
          description: 'Nao foi possivel salvar a nova ordem',
        });
      }
    },
    [fields.list, queryClient, tableSlug],
  );

  const updateRowsOrder = React.useCallback(
    async (
      updates: Array<{
        rowId: string;
        data: Record<string, unknown>;
        skipLog?: boolean;
      }>,
    ): Promise<void> => {
      try {
        await Promise.all(
          updates.map((update) => {
            let config: { headers: Record<string, string> } | undefined;
            if (update.skipLog) {
              config = { headers: { 'x-skip-log': 'true' } };
            }
            return API.put(
              '/tables/'
                .concat(tableSlug)
                .concat('/rows/')
                .concat(update.rowId),
              update.data,
              config,
            );
          }),
        );
        queryClient.invalidateQueries({
          queryKey: queryKeys.rows.lists(tableSlug),
        });
      } catch (error) {
        toast.error('Erro ao reordenar cards', {
          description: 'Nao foi possivel salvar a nova ordem',
        });
      }
    },
    [queryClient, tableSlug],
  );

  const handleDragEnd = React.useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragCardId(null);
      if (!over) return;
      const activeType = active.data.current?.type;
      const overType = over.data.current?.type;

      if (activeType === 'column') {
        const activeId = String(active.id);
        const overId = String(over.id);
        if (activeId === overId) return;
        setColumnOrder((prev) => {
          const from = prev.indexOf(activeId);
          const to = prev.indexOf(overId);
          if (from === -1 || to === -1) return prev;
          const next = arrayMove(prev, from, to);
          updateListDropdownOrder(next);
          return next;
        });
        return;
      }

      if (activeType !== 'card') return;

      const activeId = String(active.id);
      const sourceColumn: string = active.data.current?.columnId;
      const overColumnId = over.data.current?.columnId;

      // overColumnId vem do data.current do dnd-kit (tipagem frouxa).
      let targetColumn = overColumnId ?? String(over.id);
      if (overType === 'card') targetColumn = overColumnId;

      if (!fields.list) return;

      const orderSlug = await ensureOrderField();

      const sourceRows = columns.byStatus[sourceColumn] ?? [];
      let targetRows = columns.byStatus[targetColumn] ?? [];
      if (sourceColumn === targetColumn) targetRows = sourceRows;

      const sourceIds = sourceRows.map((row) => row._id);
      const targetIds = targetRows.map((row) => row._id);

      const fromIndex = sourceIds.indexOf(activeId);
      if (fromIndex === -1) return;

      let nextSourceIds = [...sourceIds];
      let nextTargetIds = [...targetIds];

      if (sourceColumn === targetColumn) {
        if (overType === 'column') {
          nextSourceIds = arrayMove(sourceIds, fromIndex, targetIds.length - 1);
        } else {
          const overId = String(over.id);
          const toIndex = targetIds.indexOf(overId);
          if (toIndex === -1) return;
          nextSourceIds = arrayMove(sourceIds, fromIndex, toIndex);
        }
        nextTargetIds = nextSourceIds;
      } else {
        nextSourceIds.splice(fromIndex, 1);
        let insertAt = targetIds.length;
        if (overType === 'card') insertAt = targetIds.indexOf(String(over.id));
        let index = insertAt;
        if (insertAt === -1 || insertAt > nextTargetIds.length) {
          index = nextTargetIds.length;
        }
        nextTargetIds.splice(index, 0, activeId);
      }

      const rowById = new Map(rowsState.map((row) => [row._id, row] as const));

      const updates: Array<{
        rowId: string;
        data: Record<string, unknown>;
        skipLog?: boolean;
      }> = [];

      const applyOrder = (ids: Array<string>, columnId: string): void => {
        ids.forEach((id, index) => {
          const row = rowById.get(id);
          if (!row) return;
          const patchData: Record<string, unknown> = {};
          // true somente para o card que efetivamente muda de coluna
          const isColumnChange =
            sourceColumn !== targetColumn && id === activeId;
          if (isColumnChange) {
            patchData[fields.list!.slug] = [columnId];
          }
          if (orderSlug) {
            patchData[orderSlug] = String(index + 1);
          }
          if (Object.keys(patchData).length > 0) {
            // skipLog: true para updates de posição-apenas (sem mudança de coluna)
            updates.push({
              rowId: id,
              data: patchData,
              skipLog: !isColumnChange,
            });
          }
          rowById.set(id, {
            ...row,
            ...(isColumnChange && { [fields.list!.slug]: [columnId] }),
            ...(orderSlug && { [orderSlug]: String(index + 1) }),
          });
        });
      };

      applyOrder(nextSourceIds, sourceColumn);
      if (sourceColumn !== targetColumn) {
        applyOrder(nextTargetIds, targetColumn);
      }

      setRowsState((prev) => prev.map((row) => rowById.get(row._id) ?? row));

      if (updates.length > 0) {
        await updateRowsOrder(updates);
      }
    },
    [
      columns.byStatus,
      ensureOrderField,
      fields.list,
      rowsState,
      updateListDropdownOrder,
      updateRowsOrder,
    ],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => {
        const activeType = event.active.data.current?.type;
        if (activeType !== 'card') return;
        setActiveDragCardId(String(event.active.id));
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveDragCardId(null);
      }}
    >
      <SortableContext
        items={orderedListOptions.map((opt) => opt.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div
          className="flex gap-4 h-full overflow-x-auto p-2"
          data-test-id="table-kanban-view"
        >
          {orderedListOptions.map((option) => (
            <KanbanColumn
              key={option.id}
              option={option}
              count={columns.byStatus[option.id].length}
              sortFieldOptions={sortFieldOptions}
              isUpdating={updateListOption.status === 'pending'}
              onUpdate={(optionId, update) => {
                updateListOption.mutate({ optionId, ...update });
              }}
            >
              <SortableContext
                items={columns.byStatus[option.id].map((row) => row._id)}
                strategy={verticalListSortingStrategy}
              >
                {columns.byStatus[option.id].map((row) => (
                  <KanbanSortableCard
                    key={row._id}
                    row={row}
                    fields={fields}
                    columnId={option.id}
                    onClick={() => {
                      setActiveRow(row);
                      setRowEditTarget(null);
                    }}
                    onFieldClick={(field) => {
                      setActiveRow(row);
                      setRowEditTarget(field);
                    }}
                  />
                ))}
              </SortableContext>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-muted-foreground cursor-pointer"
                onClick={() => {
                  setCreateColumnId(option.id);
                  setIsCreateCardOpen(true);
                }}
              >
                <PlusIcon className="size-4" />
                <span>Adicionar card</span>
              </Button>
            </KanbanColumn>
          ))}

          <KanbanUnassignedColumn
            rows={columns.unassigned}
            fields={fields}
            onSelectRow={(row) => {
              setActiveRow(row);
              setRowEditTarget(null);
            }}
            onFieldClick={(row, field) => {
              setActiveRow(row);
              setRowEditTarget(field);
            }}
          />

          <section className="w-72 shrink-0 rounded-xl border border-dashed bg-muted/10 p-4 flex items-center justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddListOpen(true)}
              disabled={!fields.list}
              className="cursor-pointer"
            >
              <PlusIcon className="size-4" />
              <span>Adicionar outra lista</span>
            </Button>
          </section>

          <KanbanRowDialog
            row={activeRow}
            onClose={() => {
              setActiveRow(null);
              setRowEditTarget(null);
            }}
            onRowUpdated={(row) => setActiveRow(row)}
            onRowDuplicated={handleRowDuplicated}
            onRowDeleted={handleRowDeleted}
            tableSlug={tableSlug}
            table={table}
            fields={fields}
            initialEditTarget={rowEditTarget}
          />

          <KanbanAddListDialog
            open={isAddListOpen}
            onOpenChange={(open) => {
              setIsAddListOpen(open);
              if (!open) {
                addListForm.reset({
                  label: '',
                  color: '#a3a3a3',
                });
              }
            }}
            form={addListForm}
            isSubmitting={addListOption.status === 'pending'}
          />

          <KanbanCreateCardDialog
            open={isCreateCardOpen}
            onOpenChange={(open) => {
              setIsCreateCardOpen(open);
              if (!open) setCreateColumnId(null);
            }}
            createForm={createForm}
            fields={fields}
            extraFields={createDialogExtraFields}
            tableSlug={tableSlug}
            createColumnOption={createColumnOption}
            isSubmitting={createRow.status === 'pending'}
            onCancel={() => setIsCreateCardOpen(false)}
          />
        </div>
      </SortableContext>
      <DragOverlay>
        {activeDragCard && (
          <div className="w-[17rem]">
            <KanbanCard
              row={activeDragCard}
              fields={fields}
              onClick={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
