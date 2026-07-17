import { useStore } from '@tanstack/react-form';
import type { AxiosError } from 'axios';
import { PlusIcon, TrashIcon } from 'lucide-react';
import React from 'react';

import {
  buildGroupRowPayload,
  getFieldDefault,
  renderGroupFormField,
  transformFieldValueForEdit,
} from './group-row-form-helpers';

import {
  UploadingProvider,
  useIsUploading,
} from '@/components/common/file-upload/uploading-context';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCreateGroupRow } from '@/hooks/tanstack-query/use-group-row-create';
import { useDeleteGroupRow } from '@/hooks/tanstack-query/use-group-row-delete';
import { useUpdateGroupRow } from '@/hooks/tanstack-query/use-group-row-update';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useFieldVisibility } from '@/hooks/use-field-visibility';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { E_FIELD_TYPE } from '@/lib/constant';
import { handleApiError } from '@/lib/handle-api-error';
import type {
  IField,
  IGroupConfiguration,
  IRow,
  ITable,
} from '@/lib/interfaces';
import {
  buildFieldValidator,
  getFieldContainerProps,
  resolveFieldLabel,
} from '@/lib/table';
import { AutoSaveStatusIndicator } from '@/routes/_private/tables/$slug/row/-auto-save-status';

type GroupRowsInlineProps = {
  tableSlug: string;
  rowId?: string;
  field: IField;
  table: ITable;
  // Itens já persistidos do grupo, embutidos no registro pai (existingRow).
  // Semeiam os cards na edição — evita uma query separada com cache stale.
  initialItems?: Array<IRow>;
  // Garante que o registro pai exista (auto-save como rascunho) e devolve o
  // rowId. Usado ao adicionar o primeiro item antes de salvar o pai.
  onEnsureParentRow: () => Promise<string | undefined>;
  // Sinaliza ao pai que um item de grupo foi adicionado, para que ele não
  // ofereça descartar o rascunho ao sair.
  onChildAdded?: () => void;
};

type Card = {
  key: string;
  item: IRow | null;
};

export function GroupRowsInline(
  props: GroupRowsInlineProps,
): React.JSX.Element {
  const {
    tableSlug,
    rowId,
    field,
    table,
    initialItems,
    onEnsureParentRow,
    onChildAdded,
  } = props;

  const groupSlug = field.group?.slug;

  const group: IGroupConfiguration | undefined = table.groups?.find(
    (g) => g?.slug === groupSlug,
  );

  const { isFieldVisible } = useFieldVisibility();

  const formFields = React.useMemo(
    (): Array<IField> =>
      (group?.fields ?? []).filter(
        (f): f is IField =>
          !!f &&
          f.type !== E_FIELD_TYPE.FIELD_GROUP &&
          f.type !== E_FIELD_TYPE.IDENTIFIER &&
          f.type !== E_FIELD_TYPE.STATUS &&
          f.type !== E_FIELD_TYPE.TRASHED_AT &&
          !f.trashed &&
          isFieldVisible(f, 'form'),
      ),
    [group, isFieldVisible],
  );

  // Semeia os cards a partir dos itens persistidos embutidos no registro pai
  // (initialItems), ignorando os que estão na lixeira (mesmo filtro do endpoint
  // de lista). Cards novos (item===null) são adicionados localmente depois.
  const [cards, setCards] = React.useState<Array<Card>>(() =>
    (initialItems ?? [])
      .filter((item) => !item.trashedAt)
      .map((item) => ({ key: String(item._id), item })),
  );
  const tempKeyRef = React.useRef<number>(0);
  const [adding, setAdding] = React.useState<boolean>(false);

  const removeCard = React.useCallback((key: string): void => {
    setCards((prev) => prev.filter((c) => c.key !== key));
  }, []);

  const isSingle = field.multiple === false;
  const addDisabled = (isSingle && cards.length >= 1) || adding;

  const handleAdd = React.useCallback(async (): Promise<void> => {
    if (addDisabled) return;
    setAdding(true);
    try {
      let ensuredRowId = rowId;
      if (!ensuredRowId) {
        ensuredRowId = await onEnsureParentRow();
      }
      if (!ensuredRowId) return;
      tempKeyRef.current += 1;
      const key = `new-${tempKeyRef.current.toString()}`;
      setCards((prev) => [...prev, { key, item: null }]);
      onChildAdded?.();
    } finally {
      setAdding(false);
    }
  }, [addDisabled, rowId, onEnsureParentRow, onChildAdded]);

  if (!groupSlug || !group) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <div
      data-slot="group-rows-inline"
      data-test-id="group-rows-inline"
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium ml-2">
          {resolveFieldLabel(field, 'form')}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(): void => {
            void handleAdd();
          }}
          disabled={addDisabled}
        >
          {adding && <Spinner />}
          {!adding && <PlusIcon className="size-4" />}
          <span>Adicionar item</span>
        </Button>
      </div>

      {cards.length === 0 && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Nenhum item adicionado.
        </p>
      )}

      <div className="space-y-3">
        {cards.map((card, index) => (
          <GroupItemCard
            key={card.key}
            index={index}
            tableSlug={tableSlug}
            rowId={rowId ?? ''}
            groupSlug={groupSlug}
            fields={formFields}
            item={card.item}
            onRemove={(): void => removeCard(card.key)}
          />
        ))}
      </div>
    </div>
  );
}

type GroupItemCardProps = {
  index: number;
  tableSlug: string;
  rowId: string;
  groupSlug: string;
  fields: Array<IField>;
  item: IRow | null;
  onRemove: () => void;
};

function GroupItemCard(props: GroupItemCardProps): React.JSX.Element {
  return (
    <UploadingProvider>
      <GroupItemCardContent {...props} />
    </UploadingProvider>
  );
}

// Todos os campos obrigatórios preenchidos no payload (não null/''/[]). Usado
// para só criar o item quando o create (que valida tudo) vai passar.
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

function GroupItemCardContent({
  index,
  tableSlug,
  rowId,
  groupSlug,
  fields,
  item,
  onRemove,
}: GroupItemCardProps): React.JSX.Element {
  const isUploading = useIsUploading();

  const itemIdRef = React.useRef<string | undefined>(item?._id);

  const defaultValues = React.useMemo((): Record<string, unknown> => {
    const defaults: Record<string, unknown> = {};
    for (const field of fields) {
      if (item) {
        defaults[field.slug] = transformFieldValueForEdit(
          item[field.slug],
          field,
        );
      } else {
        defaults[field.slug] = getFieldDefault(field);
      }
    }
    return defaults;
  }, [fields, item]);

  const triggerSaveRef = React.useRef<() => void>((): void => {});

  const form = useAppForm({
    defaultValues,
    onSubmit: async (): Promise<void> => {},
    // onChange além do onBlur: relationship/date/user/category/file só chamam
    // handleChange ao selecionar (não dão blur), então sem isto não salvariam.
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

  const _create = useCreateGroupRow({
    onSuccess(data: IRow): void {
      if (!itemIdRef.current) {
        itemIdRef.current = data._id;
      }
    },
    onError(error: AxiosError | Error): void {
      handleApiError(error, { context: 'Erro ao salvar o item' });
    },
  });

  const _update = useUpdateGroupRow({
    onError(error: AxiosError | Error): void {
      handleApiError(error, { context: 'Erro ao salvar o item' });
    },
  });

  const _delete = useDeleteGroupRow({
    onError(error: AxiosError | Error): void {
      handleApiError(error, { context: 'Erro ao remover o item' });
    },
  });

  // Persiste via create/update normais (como o Sheet). O registro pai sempre tem
  // _id, então não há mais auto-save de item. Create valida todos obrigatórios;
  // update aceita parcial.
  const performSave = React.useCallback(async (): Promise<void> => {
    if (_create.isPending || _update.isPending) return;
    if (isUploading) return;
    const payload = buildGroupRowPayload(form.state.values, fields);
    if (itemIdRef.current) {
      await _update.mutateAsync({
        tableSlug,
        rowId,
        groupSlug,
        itemId: itemIdRef.current,
        data: payload,
      });
      return;
    }
    const created = await _create.mutateAsync({
      tableSlug,
      rowId,
      groupSlug,
      data: payload,
    });
    itemIdRef.current = created._id;
  }, [
    _create,
    _update,
    isUploading,
    form,
    fields,
    tableSlug,
    rowId,
    groupSlug,
  ]);

  // Gate: card novo só cria quando os obrigatórios estão preenchidos (create
  // valida tudo); item já existente atualiza parcialmente.
  const canSaveCallback = React.useCallback((): boolean => {
    if (!isDirty) return false;
    if (itemIdRef.current) return true;
    return allRequiredFilled(
      buildGroupRowPayload(form.state.values, fields),
      fields,
    );
  }, [isDirty, form, fields]);

  const isDirtyCallback = React.useCallback((): boolean => {
    return isDirty;
  }, [isDirty]);

  const { status, lastSavedAt, triggerSave, cancelPending } = useAutoSave({
    onSave: performSave,
    isDraft: false,
    canSave: canSaveCallback,
    isDirty: isDirtyCallback,
  });

  triggerSaveRef.current = triggerSave;

  const handleRemove = React.useCallback(async (): Promise<void> => {
    cancelPending();
    if (itemIdRef.current) {
      await _delete.mutateAsync({
        tableSlug,
        rowId,
        groupSlug,
        itemId: itemIdRef.current,
      });
    }
    onRemove();
  }, [cancelPending, _delete, tableSlug, rowId, groupSlug, onRemove]);

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {`Item ${(index + 1).toString()}`}
          </span>
          <AutoSaveStatusIndicator
            status={status}
            lastSavedAt={lastSavedAt}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={_delete.isPending}
          onClick={(): void => {
            void handleRemove();
          }}
        >
          {_delete.isPending && <Spinner />}
          {!_delete.isPending && <TrashIcon className="size-3.5" />}
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        {fields.map((field) => (
          <div
            key={field._id}
            {...getFieldContainerProps(field.widthInForm)}
          >
            <form.AppField
              name={field.slug}
              validators={{
                // form de grupo é tipado Record<string, unknown>; buildFieldValidator
                // espera FieldValue — impedância genuína neste boundary dinâmico.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange: ({ value }: { value: any }) =>
                  buildFieldValidator(field, value),
              }}
            >
              {(formField) =>
                renderGroupFormField(formField, field, tableSlug, groupSlug)
              }
            </form.AppField>
          </div>
        ))}
      </div>
    </div>
  );
}
