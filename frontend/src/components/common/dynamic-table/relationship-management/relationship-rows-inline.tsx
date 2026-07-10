import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { GripVerticalIcon, PlusIcon, TrashIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { RelationshipSelectExistingSheet } from './relationship-select-existing-sheet';

import {
  UploadingProvider,
  useIsUploading,
} from '@/components/common/file-upload/uploading-context';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useRelationshipLinkCreate } from '@/hooks/tanstack-query/use-relationship-link-create';
import { useRelationshipLinkDelete } from '@/hooks/tanstack-query/use-relationship-link-delete';
import { useRelationshipLinksList } from '@/hooks/tanstack-query/use-relationship-links-list';
import { useRelationshipLinksReorder } from '@/hooks/tanstack-query/use-relationship-links-reorder';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useCreateTableRow } from '@/hooks/tanstack-query/use-table-row-create';
import { useReadTableRow } from '@/hooks/tanstack-query/use-table-row-read';
import { useUpdateTableRow } from '@/hooks/tanstack-query/use-table-row-update';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { E_FIELD_FORMAT, E_FIELD_TYPE } from '@/lib/constant';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';
import type {
  IField,
  IRelationshipLink,
  IRow,
  ITable,
  Merge,
} from '@/lib/interfaces';
import { isFieldShownInContext } from '@/lib/permission';
import type { FieldValue } from '@/lib/table';
import {
  buildCreateRowDefaultValues,
  buildFieldValidator,
  buildRowPayload,
  buildUpdateRowDefaultValues,
  getFieldContainerProps,
  resolveFieldLabel,
} from '@/lib/table';
import { AutoSaveStatusIndicator } from '@/routes/_private/tables/$slug/row/-auto-save-status';

// Lado oposto do vínculo: a partir do registro atual (source) chegamos ao
// targetId; a partir do target chegamos ao sourceId.
export function otherIdOf(
  link: IRelationshipLink,
  side: 'source' | 'target',
): string {
  if (side === 'source') return link.targetId;
  return link.sourceId;
}

// Lado não-múltiplo (1:1 ou ponta "um" do 1:N) trava em um único card.
export function isSingleLocked(
  isMultiple: boolean,
  cardCount: number,
): boolean {
  if (isMultiple) return false;
  return cardCount >= 1;
}

// Campos editáveis da tabela relacionada exibidos em cada card, na ordem do
// formulário. Só campos simples — exclui nativos, FIELD_GROUP e RELATIONSHIP:
// o vínculo com o registro atual é automático pelo _id, então não faz sentido
// pedir para selecionar a tabela atual de novo nem aninhar outros vínculos.
export function getRelatedFormFields(table: ITable): Array<IField> {
  const order = table.fieldOrderForm;
  return table.fields
    .filter(
      (field): field is IField =>
        !field.trashed &&
        !field.native &&
        field.type !== E_FIELD_TYPE.FIELD_GROUP &&
        field.type !== E_FIELD_TYPE.RELATIONSHIP &&
        field.type !== E_FIELD_TYPE.REACTION &&
        field.type !== E_FIELD_TYPE.EVALUATION &&
        field.type !== E_FIELD_TYPE.IDENTIFIER &&
        field.type !== E_FIELD_TYPE.STATUS &&
        field.type !== E_FIELD_TYPE.TRASHED_AT &&
        isFieldShownInContext(field, 'form'),
    )
    .sort((a, b): number => {
      const rawA = order.indexOf(a._id);
      const rawB = order.indexOf(b._id);
      let sortA: number = rawA;
      if (rawA === -1) sortA = Infinity;
      let sortB: number = rawB;
      if (rawB === -1) sortB = Infinity;
      return sortA - sortB;
    });
}

// Todos os campos obrigatórios preenchidos — gate do auto-save do card novo
// (create valida tudo). Mesma semântica do group-rows-inline.
function allRequiredFilled(
  payload: Record<string, unknown>,
  fields: Array<IField>,
): boolean {
  for (const field of fields) {
    if (!field.required) continue;
    const value = payload[field.slug];
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.length === 0) return false;
    if (Array.isArray(value) && value.length === 0) return false;
  }
  return true;
}

type RelationshipRowsInlineProps = {
  field: IField;
  parentTableSlug: string;
  rowId?: string;
  canEdit: boolean;
  onEnsureParentRow?: () => Promise<string | undefined>;
  onChildAdded?: () => void;
  onLinkCountChange?: (count: number) => void;
};

export function RelationshipRowsInline(
  props: RelationshipRowsInlineProps,
): React.JSX.Element {
  const {
    field,
    parentTableSlug,
    rowId,
    canEdit,
    onEnsureParentRow,
    onChildAdded,
    onLinkCountChange,
  } = props;

  const relConfig = field.relationship;
  const relationshipId = relConfig?.relationshipId ?? '';
  const side: 'source' | 'target' = relConfig?.side ?? 'source';
  const otherTableSlug = relConfig?.table?.slug ?? '';
  const isMultiple = Boolean(field.multiple);
  const recordId = rowId ?? '';

  const queryClient = useQueryClient();
  const [page, setPage] = React.useState<number>(1);
  const [adding, setAdding] = React.useState<boolean>(false);
  const [drafts, setDrafts] = React.useState<Array<string>>([]);
  const tempKeyRef = React.useRef<number>(0);
  const [orderedLinks, setOrderedLinks] = React.useState<
    Array<IRelationshipLink>
  >([]);

  const relatedTable = useReadTable({ slug: otherTableSlug });

  const relatedFormFields = React.useMemo((): Array<IField> => {
    if (!relatedTable.data) return [];
    return getRelatedFormFields(relatedTable.data);
  }, [relatedTable.data]);

  const linksQuery = useRelationshipLinksList({
    tableSlug: parentTableSlug,
    relationshipId,
    side,
    recordId,
    page,
    perPage: 10,
  });

  const meta = linksQuery.data?.meta;
  const links = React.useMemo(
    (): Array<IRelationshipLink> => linksQuery.data?.data ?? [],
    [linksQuery.data?.data],
  );

  React.useEffect((): void => {
    setOrderedLinks(links);
  }, [links]);

  React.useEffect((): void => {
    onLinkCountChange?.(links.length);
  }, [links.length, onLinkCountChange]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const invalidateRows = React.useCallback((): void => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.rows.all(parentTableSlug),
    });
  }, [queryClient, parentTableSlug]);

  const deleteLink = useRelationshipLinkDelete({
    tableSlug: parentTableSlug,
    relationshipId,
    side,
    recordId,
    onSuccess(): void {
      invalidateRows();
    },
    onError(error): void {
      // Surfacing da mensagem do backend (ex.: RELATIONSHIP_REQUIRED ao
      // desvincular o último vínculo de um campo obrigatório).
      handleApiError(error, {
        context: 'Não foi possível desvincular o registro',
      });
    },
  });

  const reorderLinks = useRelationshipLinksReorder({
    tableSlug: parentTableSlug,
    relationshipId,
    side,
    recordId,
    onError(): void {
      toast.error('Não foi possível reordenar os vínculos');
    },
  });

  const ensureParent = React.useCallback(async (): Promise<boolean> => {
    if (recordId) return true;
    if (!onEnsureParentRow) return false;
    const ensured = await onEnsureParentRow();
    if (!ensured) return false;
    onChildAdded?.();
    return true;
  }, [recordId, onEnsureParentRow, onChildAdded]);

  function handleRemove(linkId: string): void {
    // Campo obrigatório: não deixar sem nenhum vínculo. O backend também barra
    // (RELATIONSHIP_REQUIRED); aqui é só o aviso preventivo.
    if (field.required && orderedLinks.length <= 1) {
      toast.error('Campo obrigatório', {
        description: 'Vincule outro registro antes de desvincular este.',
      });
      return;
    }
    deleteLink.mutate({ linkId });
  }

  function handleDraftRemove(key: string): void {
    setDrafts((prev) => prev.filter((k) => k !== key));
  }

  function handleDraftCreated(key: string): void {
    setDrafts((prev) => prev.filter((k) => k !== key));
    onChildAdded?.();
    invalidateRows();
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedLinks.findIndex((l) => l._id === active.id);
    const newIndex = orderedLinks.findIndex((l) => l._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(orderedLinks, oldIndex, newIndex);
    setOrderedLinks(next);
    reorderLinks.mutate({
      items: next.map((l, index) => ({ linkId: l._id, order: index })),
    });
  }

  const cardCount = orderedLinks.length + drafts.length;
  const singleLocked = isSingleLocked(isMultiple, cardCount);

  const handleAdd = React.useCallback(async (): Promise<void> => {
    if (
      adding ||
      isSingleLocked(isMultiple, orderedLinks.length + drafts.length)
    ) {
      return;
    }
    setAdding(true);
    try {
      const ok = await ensureParent();
      if (!ok) return;
      tempKeyRef.current += 1;
      const key = `draft-${tempKeyRef.current.toString()}`;
      setDrafts((prev) => [...prev, key]);
    } finally {
      setAdding(false);
    }
  }, [adding, isMultiple, orderedLinks.length, drafts.length, ensureParent]);

  if (!relationshipId) {
    return (
      <div
        data-slot="relationship-rows-inline"
        className="space-y-2"
      >
        <span className="text-sm font-medium ml-2">
          {resolveFieldLabel(field, 'detail')}
        </span>
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Relacionamento ainda não materializado.
        </p>
      </div>
    );
  }

  // Form público anônimo: sem registro pai e sem como criar rascunho.
  if (!recordId && !onEnsureParentRow) {
    return (
      <div
        data-slot="relationship-rows-inline"
        className="space-y-2"
      >
        <span className="text-sm font-medium ml-2">
          {resolveFieldLabel(field, 'detail')}
        </span>
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Salve o registro para adicionar{' '}
          {resolveFieldLabel(field, 'detail').toLowerCase()}.
        </p>
      </div>
    );
  }

  // Reordenar só com página única: a ordem é o índice absoluto.
  const singlePage = !meta || meta.lastPage <= 1;
  const canReorder = isMultiple && canEdit && singlePage;
  const showAdd = canEdit && !singleLocked;

  return (
    <div
      data-slot="relationship-rows-inline"
      data-test-id="relationship-rows-inline"
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium ml-2">
          {resolveFieldLabel(field, 'detail')}
        </span>
        {showAdd && (
          <div className="flex items-center gap-2">
            {relatedTable.data && (
              <RelationshipSelectExistingSheet
                asChild
                field={field}
                relatedTable={relatedTable.data}
                parentTableSlug={parentTableSlug}
                relationshipId={relationshipId}
                side={side}
                recordId={recordId}
                onChanged={invalidateRows}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                >
                  <span>Vincular existente</span>
                </Button>
              </RelationshipSelectExistingSheet>
            )}
            {!relatedTable.data && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
              >
                <span>Vincular existente</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={adding}
              onClick={(): void => {
                void handleAdd();
              }}
            >
              {adding && <Spinner />}
              {!adding && <PlusIcon className="size-4" />}
              <span>Criar novo</span>
            </Button>
          </div>
        )}
      </div>

      {linksQuery.isLoading && (
        <div className="flex items-center justify-center p-4">
          <Spinner className="opacity-50" />
        </div>
      )}

      {!linksQuery.isLoading && cardCount === 0 && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Nenhum item adicionado.
        </p>
      )}

      {orderedLinks.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedLinks.map((l) => l._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {orderedLinks.map((link, index): React.JSX.Element => {
                const otherId = otherIdOf(link, side);
                return (
                  <SortableRelationshipCard
                    key={link._id}
                    linkId={link._id}
                    index={index}
                    sortable={canReorder}
                    otherTableSlug={otherTableSlug}
                    otherId={otherId}
                    fields={relatedFormFields}
                    canEdit={canEdit}
                    isRemoving={deleteLink.isPending}
                    onRemove={(): void => handleRemove(link._id)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {drafts.length > 0 && (
        <div className="space-y-3">
          {drafts.map(
            (key, index): React.JSX.Element => (
              <RelationshipDraftCard
                key={key}
                index={orderedLinks.length + index}
                otherTableSlug={otherTableSlug}
                parentTableSlug={parentTableSlug}
                relationshipId={relationshipId}
                side={side}
                recordId={recordId}
                fields={relatedFormFields}
                onCreated={(): void => handleDraftCreated(key)}
                onCancel={(): void => handleDraftRemove(key)}
              />
            ),
          )}
        </div>
      )}

      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={(): void => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-muted-foreground">
            {meta.page} / {meta.lastPage}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= meta.lastPage}
            onClick={(): void => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {singleLocked && canEdit && (
        <p className="text-xs text-muted-foreground">
          Este lado aceita apenas um item. Remova o atual para trocar.
        </p>
      )}
    </div>
  );
}

type SortableRelationshipCardProps = {
  linkId: string;
  index: number;
  sortable: boolean;
  otherTableSlug: string;
  otherId: string;
  fields: Array<IField>;
  canEdit: boolean;
  isRemoving: boolean;
  onRemove: () => void;
};

function SortableRelationshipCard({
  linkId,
  index,
  sortable,
  otherTableSlug,
  otherId,
  fields,
  canEdit,
  isRemoving,
  onRemove,
}: SortableRelationshipCardProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: linkId, disabled: !sortable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  let dragHandle: React.ReactNode = null;
  if (sortable) {
    dragHandle = (
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
    >
      <RelationshipItemCard
        index={index}
        otherTableSlug={otherTableSlug}
        otherId={otherId}
        fields={fields}
        canEdit={canEdit}
        isRemoving={isRemoving}
        onRemove={onRemove}
        dragHandle={dragHandle}
      />
    </div>
  );
}

type RelationshipItemCardProps = {
  index: number;
  otherTableSlug: string;
  otherId: string;
  fields: Array<IField>;
  canEdit: boolean;
  isRemoving: boolean;
  onRemove: () => void;
  dragHandle: React.ReactNode;
};

export function RelationshipItemCard(
  props: RelationshipItemCardProps,
): React.JSX.Element {
  return (
    <UploadingProvider>
      <RelationshipItemCardLoader {...props} />
    </UploadingProvider>
  );
}

function RelationshipItemCardLoader(
  props: RelationshipItemCardProps,
): React.JSX.Element {
  const related = useReadTableRow({
    slug: props.otherTableSlug,
    rowId: props.otherId,
  });

  if (related.isLoading || !related.data) {
    return (
      <div className="flex items-center justify-center rounded-md border p-4">
        <Spinner className="opacity-50" />
      </div>
    );
  }

  return (
    <RelationshipItemCardForm
      row={related.data}
      index={props.index}
      otherTableSlug={props.otherTableSlug}
      otherId={props.otherId}
      fields={props.fields}
      canEdit={props.canEdit}
      isRemoving={props.isRemoving}
      onRemove={props.onRemove}
      dragHandle={props.dragHandle}
    />
  );
}

type RelationshipItemCardFormProps = Merge<
  RelationshipItemCardProps,
  {
    row: IRow;
  }
>;

function RelationshipItemCardForm({
  row,
  index,
  otherTableSlug,
  otherId,
  fields,
  canEdit,
  isRemoving,
  onRemove,
  dragHandle,
}: RelationshipItemCardFormProps): React.JSX.Element {
  const isUploading = useIsUploading();

  const defaultValues = React.useMemo((): ReturnType<
    typeof buildUpdateRowDefaultValues
  > => {
    return buildUpdateRowDefaultValues(row, fields);
  }, [row, fields]);

  const triggerSaveRef = React.useRef<() => void>((): void => {});

  const form = useAppForm({
    defaultValues,
    onSubmit: async (): Promise<void> => {},
    listeners: {
      onBlur: (): void => {
        triggerSaveRef.current();
      },
      onChange: (): void => {
        triggerSaveRef.current();
      },
    },
  });

  const isDirty = useStore(form.store, (state) => state.isDirty);

  const update = useUpdateTableRow({
    onError(error: AxiosError | Error): void {
      handleApiError(error, {
        context: 'Erro ao salvar o registro relacionado',
        onFieldErrors: (errors): void => {
          applyApiFieldErrors(form, errors);
        },
      });
    },
  });

  const performSave = React.useCallback(async (): Promise<void> => {
    if (update.isPending) return;
    if (isUploading) return;
    const payload = buildRowPayload(form.state.values, fields);
    await update.mutateAsync({
      slug: otherTableSlug,
      rowId: otherId,
      data: payload,
    });
  }, [update, isUploading, form, fields, otherTableSlug, otherId]);

  const canSaveCallback = React.useCallback((): boolean => isDirty, [isDirty]);
  const isDirtyCallback = React.useCallback((): boolean => isDirty, [isDirty]);

  const { status, lastSavedAt, triggerSave, cancelPending } = useAutoSave({
    onSave: performSave,
    isDraft: false,
    canSave: canSaveCallback,
    isDirty: isDirtyCallback,
  });

  triggerSaveRef.current = triggerSave;

  const handleRemove = React.useCallback((): void => {
    cancelPending();
    onRemove();
  }, [cancelPending, onRemove]);

  return (
    <RelationshipCardShell
      index={index}
      status={status}
      lastSavedAt={lastSavedAt}
      canEdit={canEdit}
      isRemoving={isRemoving}
      onRemove={handleRemove}
      dragHandle={dragHandle}
    >
      <div className="flex flex-wrap gap-4">
        {fields.map((cardField) => (
          <div
            key={cardField._id}
            {...getFieldContainerProps(cardField.widthInForm)}
          >
            <form.AppField
              name={cardField.slug}
              validators={{
                onChange: ({
                  value,
                }: {
                  value: FieldValue | undefined;
                }): string | undefined => buildFieldValidator(cardField, value),
              }}
            >
              {(formField): React.JSX.Element | null =>
                renderRelationshipCardField(
                  formField,
                  cardField,
                  otherTableSlug,
                )
              }
            </form.AppField>
          </div>
        ))}
      </div>
    </RelationshipCardShell>
  );
}

type RelationshipDraftCardProps = {
  index: number;
  otherTableSlug: string;
  parentTableSlug: string;
  relationshipId: string;
  side: 'source' | 'target';
  recordId: string;
  fields: Array<IField>;
  onCreated: () => void;
  onCancel: () => void;
};

function RelationshipDraftCard(
  props: RelationshipDraftCardProps,
): React.JSX.Element {
  return (
    <UploadingProvider>
      <RelationshipDraftCardContent {...props} />
    </UploadingProvider>
  );
}

function RelationshipDraftCardContent({
  index,
  otherTableSlug,
  parentTableSlug,
  relationshipId,
  side,
  recordId,
  fields,
  onCreated,
  onCancel,
}: RelationshipDraftCardProps): React.JSX.Element {
  const isUploading = useIsUploading();

  const defaultValues = React.useMemo((): ReturnType<
    typeof buildCreateRowDefaultValues
  > => {
    return buildCreateRowDefaultValues(fields);
  }, [fields]);

  const triggerSaveRef = React.useRef<() => void>((): void => {});
  const createdRef = React.useRef<boolean>(false);

  const form = useAppForm({
    defaultValues,
    onSubmit: async (): Promise<void> => {},
    listeners: {
      onBlur: (): void => {
        triggerSaveRef.current();
      },
      onChange: (): void => {
        triggerSaveRef.current();
      },
    },
  });

  const isDirty = useStore(form.store, (state) => state.isDirty);

  const createRow = useCreateTableRow({
    onError(error: AxiosError | Error): void {
      handleApiError(error, {
        context: 'Erro ao criar o registro relacionado',
        onFieldErrors: (errors): void => {
          applyApiFieldErrors(form, errors);
        },
      });
    },
  });

  const createLink = useRelationshipLinkCreate({
    tableSlug: parentTableSlug,
    relationshipId,
    side,
    recordId,
    onError(): void {
      toast.error('Não foi possível vincular o registro');
    },
  });

  const performSave = React.useCallback(async (): Promise<void> => {
    if (createdRef.current) return;
    if (createRow.isPending || createLink.isPending) return;
    if (isUploading) return;
    const payload = buildRowPayload(form.state.values, fields);
    if (!allRequiredFilled(payload, fields)) return;
    createdRef.current = true;
    try {
      const created = await createRow.mutateAsync({
        slug: otherTableSlug,
        data: payload,
      });
      await createLink.mutateAsync({ otherId: String(created._id) });
      onCreated();
    } catch {
      createdRef.current = false;
    }
  }, [
    createRow,
    createLink,
    isUploading,
    form,
    fields,
    otherTableSlug,
    onCreated,
  ]);

  const canSaveCallback = React.useCallback((): boolean => {
    if (!isDirty) return false;
    return allRequiredFilled(
      buildRowPayload(form.state.values, fields),
      fields,
    );
  }, [isDirty, form, fields]);

  const isDirtyCallback = React.useCallback((): boolean => isDirty, [isDirty]);

  const { status, lastSavedAt, triggerSave, cancelPending } = useAutoSave({
    onSave: performSave,
    isDraft: false,
    canSave: canSaveCallback,
    isDirty: isDirtyCallback,
  });

  triggerSaveRef.current = triggerSave;

  const isPending = createRow.isPending || createLink.isPending;

  const handleRemove = React.useCallback((): void => {
    cancelPending();
    onCancel();
  }, [cancelPending, onCancel]);

  return (
    <RelationshipCardShell
      index={index}
      status={status}
      lastSavedAt={lastSavedAt}
      canEdit={true}
      isRemoving={isPending}
      onRemove={handleRemove}
      dragHandle={null}
    >
      <div className="flex flex-wrap gap-4">
        {fields.map((cardField) => (
          <div
            key={cardField._id}
            {...getFieldContainerProps(cardField.widthInForm)}
          >
            <form.AppField
              name={cardField.slug}
              validators={{
                onChange: ({
                  value,
                }: {
                  value: FieldValue | undefined;
                }): string | undefined => buildFieldValidator(cardField, value),
              }}
            >
              {(formField): React.JSX.Element | null =>
                renderRelationshipCardField(
                  formField,
                  cardField,
                  otherTableSlug,
                )
              }
            </form.AppField>
          </div>
        ))}
      </div>
    </RelationshipCardShell>
  );
}

type RelationshipCardShellProps = {
  index: number;
  status: React.ComponentProps<typeof AutoSaveStatusIndicator>['status'];
  lastSavedAt: React.ComponentProps<
    typeof AutoSaveStatusIndicator
  >['lastSavedAt'];
  canEdit: boolean;
  isRemoving: boolean;
  onRemove: () => void;
  dragHandle: React.ReactNode;
  children: React.ReactNode;
};

function RelationshipCardShell({
  index,
  status,
  lastSavedAt,
  canEdit,
  isRemoving,
  onRemove,
  dragHandle,
  children,
}: RelationshipCardShellProps): React.JSX.Element {
  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dragHandle}
          <span className="text-xs font-medium text-muted-foreground">
            {`Item ${(index + 1).toString()}`}
          </span>
          <AutoSaveStatusIndicator
            status={status}
            lastSavedAt={lastSavedAt}
          />
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isRemoving}
            onClick={onRemove}
          >
            {isRemoving && <Spinner />}
            {!isRemoving && <TrashIcon className="size-3.5" />}
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

export function renderRelationshipCardField(
  // formField expõe componentes de campo do app (TableRow*) — sem tipo exportado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formField: any,
  field: IField,
  tableSlug: string,
): React.JSX.Element | null {
  switch (field.type) {
    case E_FIELD_TYPE.TEXT_SHORT:
      return (
        <formField.TableRowTextField
          field={field}
          disabled={false}
        />
      );
    case E_FIELD_TYPE.TEXT_LONG:
      if (field.format === E_FIELD_FORMAT.RICH_TEXT) {
        return (
          <formField.TableRowRichTextField
            field={field}
            disabled={false}
          />
        );
      }
      return (
        <formField.TableRowTextareaField
          field={field}
          disabled={false}
        />
      );
    case E_FIELD_TYPE.DROPDOWN:
      return (
        <formField.TableRowDropdownField
          field={field}
          disabled={false}
          tableSlug={tableSlug}
        />
      );
    case E_FIELD_TYPE.DATE:
      return (
        <formField.TableRowDateField
          field={field}
          disabled={false}
        />
      );
    case E_FIELD_TYPE.FILE:
      return (
        <formField.TableRowFileField
          field={field}
          disabled={false}
        />
      );
    case E_FIELD_TYPE.CATEGORY:
      return (
        <formField.TableRowCategoryField
          field={field}
          disabled={false}
        />
      );
    case E_FIELD_TYPE.USER:
      return (
        <formField.TableRowUserField
          field={field}
          disabled={false}
        />
      );
    default:
      return null;
  }
}
