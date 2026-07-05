import type { AnyFieldMetaBase } from '@tanstack/form-core';
import { useStore } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import React from 'react';

import { AutoSaveStatusIndicator } from './-auto-save-status';
import { RowFormFields } from './create/-create-form';

import { GroupRowsInline } from '@/components/common/dynamic-table/group-rows';
import { RelationshipRowsInline } from '@/components/common/dynamic-table/relationship-management/relationship-rows-inline';
import { ExtensionSlot } from '@/components/common/extension-slot';
import {
  UploadingProvider,
  useIsUploading,
} from '@/components/common/file-upload/uploading-context';
import { AccessDenied } from '@/components/common/route-status/access-denied';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useConditionalFieldsRuntimeConfig } from '@/hooks/tanstack-query/use-conditional-fields-runtime-config';
import { useAutoSaveTableRow } from '@/hooks/tanstack-query/use-table-row-auto-save';
import { useCreateTableRow } from '@/hooks/tanstack-query/use-table-row-create';
import { useDeleteTableRow } from '@/hooks/tanstack-query/use-table-row-delete';
import { useUpdateTableRow } from '@/hooks/tanstack-query/use-table-row-update';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useFieldVisibility } from '@/hooks/use-field-visibility';
import { useTablePermission } from '@/hooks/use-table-permission';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { useApiErrorAutoClear } from '@/integrations/tanstack-form/use-api-error-auto-clear';
import {
  omitHiddenConditionalValues,
  resolveConditionalVisibility,
} from '@/lib/conditional-form-rules';
import { E_FIELD_TYPE } from '@/lib/constant';
import { firstCategoryField } from '@/lib/document-helpers';
import { applyApiFieldErrors } from '@/lib/form-utils';
import { handleApiError } from '@/lib/handle-api-error';
import type { IField, IRow, ITable } from '@/lib/interfaces';
import type { CreateRowDefaultValue } from '@/lib/table';
import {
  buildCreateRowDefaultValues,
  buildRowPayload,
  buildUpdateRowDefaultValues,
  isManagedRelationship,
  resolveFieldLabel,
} from '@/lib/table';
import { useAuthStore } from '@/stores/authentication';

type AutoSaveRowFormProps = {
  table: ITable;
  rowId?: string;
  existingRow?: IRow;
  initialCategory?: string;
  onBack?: () => void;
  backGuardRef?: React.MutableRefObject<(() => void) | null>;
};

// Itens de um grupo de campos vêm embutidos no documento do registro
// (existingRow[groupSlug]). Usados para semear os cards do grupo na edição.
function groupItemsOf(row: IRow | undefined, slug: string): Array<IRow> {
  if (!row) return [];
  const value = row[slug];
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is IRow =>
        typeof item === 'object' && item !== null && '_id' in item,
    );
  }
  return [];
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (
    typeof value === 'object' &&
    'storages' in value &&
    Array.isArray(value.storages)
  ) {
    return value.storages.length > 0;
  }
  return false;
}

export function AutoSaveRowForm(
  props: AutoSaveRowFormProps,
): React.JSX.Element {
  return (
    <UploadingProvider>
      <AutoSaveRowFormContent {...props} />
    </UploadingProvider>
  );
}

function AutoSaveRowFormContent({
  table,
  rowId: initialRowId,
  existingRow,
  initialCategory,
  onBack,
  backGuardRef,
}: AutoSaveRowFormProps): React.JSX.Element {
  const permissions = useTablePermission(table);
  const isUploading = useIsUploading();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s): boolean => Boolean(s.user));

  const isNewRecord = !initialRowId;
  const rowIdRef = React.useRef<string | undefined>(initialRowId);
  // Espelha o rowId em estado para re-renderizar a seção de grupos quando o
  // registro novo é persistido pelo auto-save (refs não disparam render).
  const [persistedRowId, setPersistedRowId] = React.useState<
    string | undefined
  >(initialRowId);
  const [isDraft, setIsDraft] = React.useState<boolean>(
    existingRow?.status === 'draft',
  );
  const [missingRequired, setMissingRequired] = React.useState<boolean>(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] =
    React.useState<boolean>(false);
  // Marca que o usuário adicionou um item de grupo. Os grupos têm form próprio,
  // então o isDirty do form principal não os reflete; sem isso, um rascunho com
  // filhos seria oferecido para descarte ao sair.
  const childAddedRef = React.useRef<boolean>(false);
  // Contagem de vínculos por campo RELATIONSHIP, reportada pelo repetidor. Usada
  // para validar o required do lado sem ler o form (links vivem fora dele).
  const relationshipLinkCountRef = React.useRef<Record<string, number>>({});
  const handleLinkCountChange = React.useCallback(
    (fieldSlug: string, count: number): void => {
      relationshipLinkCountRef.current[fieldSlug] = count;
    },
    [],
  );

  const slug = table.slug;

  const { isFieldVisible } = useFieldVisibility();

  const fields = React.useMemo((): Array<IField> => {
    const order = table.fieldOrderForm;
    return table.fields
      .filter((f) => !f.trashed && isFieldVisible(f, 'form'))
      .sort((a: IField, b: IField): number => {
        const idxA = order.indexOf(a._id);
        const idxB = order.indexOf(b._id);
        let sortA = idxA;
        let sortB = idxB;
        if (idxA === -1) sortA = Infinity;
        if (idxB === -1) sortB = Infinity;
        return sortA - sortB;
      });
  }, [table.fields, table.fieldOrderForm, isFieldVisible]);

  // Relationship em modo 'manage' fica fora dos obrigatórios genéricos: seus
  // valores não vivem no form (geridos pelo repetidor via /links); o required é
  // validado por contagem de vínculos. Em modo 'select' o valor vive no form
  // (combobox) e segue o caminho de required normal.
  const requiredFields = React.useMemo((): Array<IField> => {
    return fields.filter((f) => {
      if (!f.required || f.native) return false;
      // Só N:N 'manage' fica fora (vínculos via /links); 1:1/1:N viram select.
      if (isManagedRelationship(f)) return false;
      return true;
    });
  }, [fields]);

  // Grupos de campos exibidos no formulário. Salvos à parte via endpoints
  // group-rows (precisam de rowId), não no payload do registro principal.
  const formGroupFields = React.useMemo((): Array<IField> => {
    return table.fields.filter(
      (f) =>
        f.type === E_FIELD_TYPE.FIELD_GROUP &&
        isFieldVisible(f, 'form') &&
        !f.trashed,
    );
  }, [table.fields, isFieldVisible]);

  // Campos RELATIONSHIP em modo 'manage' (repetidor): persistidos via /links,
  // fora do payload. Modo 'select' é renderizado por RowFormFields (combobox) e
  // entra no payload (dual-write). Ausência de formMode = 'select'.
  const formRelationshipFields = React.useMemo((): Array<IField> => {
    return table.fields.filter(
      (f) =>
        isManagedRelationship(f) && isFieldVisible(f, 'form') && !f.trashed,
    );
  }, [table.fields, isFieldVisible]);

  // Apenas os slugs de modo 'manage' saem do payload (select fica no dual-write).
  const relationshipSlugs = React.useMemo((): Set<string> => {
    return new Set(formRelationshipFields.map((f) => f.slug));
  }, [formRelationshipFields]);

  const categoryOverride = React.useMemo(():
    | CreateRowDefaultValue
    | undefined => {
    if (!initialCategory) return undefined;
    const categoryField = firstCategoryField(
      table.fields,
      table.fieldOrderForm,
      table.layoutFields,
    );
    if (!categoryField) return undefined;
    return { [categoryField.slug]: [initialCategory] };
  }, [initialCategory, table.fields, table.fieldOrderForm, table.layoutFields]);

  const defaultValues = React.useMemo((): CreateRowDefaultValue => {
    if (existingRow) {
      return buildUpdateRowDefaultValues(existingRow, fields);
    }
    return buildCreateRowDefaultValues(fields, categoryOverride);
  }, [existingRow, fields, categoryOverride]);

  // O save e disparado no blur do campo. triggerSave so existe apos o form
  // (depende de performSave), entao o listener chama atraves de um ref.
  const triggerSaveRef = React.useRef<() => void>((): void => {});

  const form = useAppForm({
    defaultValues,
    onSubmit: async (): Promise<void> => {},
    listeners: {
      onBlur: (): void => {
        triggerSaveRef.current();
      },
    },
  });

  useApiErrorAutoClear(form);

  const isDirty = useStore(form.store, (state) => state.isDirty);
  const formValues = useStore(form.store, (state) => state.values);
  const conditionalConfig = useConditionalFieldsRuntimeConfig(slug, true);

  const conditionalVisibility = React.useMemo(() => {
    return resolveConditionalVisibility(
      fields,
      conditionalConfig.data?.rules ?? [],
      formValues,
    );
  }, [fields, conditionalConfig.data?.rules, formValues]);

  const visibleFields = conditionalVisibility.visibleFields;
  const visibleFormGroupFields = React.useMemo((): Array<IField> => {
    return formGroupFields.filter(
      (field) => !conditionalVisibility.hiddenFieldIds.has(field._id),
    );
  }, [formGroupFields, conditionalVisibility.hiddenFieldIds]);
  const visibleFormRelationshipFields = React.useMemo((): Array<IField> => {
    return formRelationshipFields.filter(
      (field) => !conditionalVisibility.hiddenFieldIds.has(field._id),
    );
  }, [formRelationshipFields, conditionalVisibility.hiddenFieldIds]);

  const _autoSave = useAutoSaveTableRow({
    onSuccess(data: IRow): void {
      setIsDraft(data.status === 'draft');
      if (!rowIdRef.current) {
        rowIdRef.current = data._id;
      }
      setPersistedRowId(data._id);
    },
    onError(error: AxiosError | Error): void {
      handleApiError(error, {
        context: 'Erro ao salvar o registro',
        onFieldErrors: (errors: Record<string, string>): void => {
          applyApiFieldErrors(form, errors);
        },
      });
    },
  });

  // Salvar (publicar) usa os endpoints reais de create/update, que aplicam o
  // guard de campos obrigatorios no backend e marcam status='published'.
  const _create = useCreateTableRow({
    onSuccess(data: IRow): void {
      rowIdRef.current = data._id;
      setPersistedRowId(data._id);
      setIsDraft(false);
    },
    onError(error: AxiosError | Error): void {
      handleApiError(error, {
        context: 'Erro ao salvar o registro',
        onFieldErrors: (errors: Record<string, string>): void => {
          applyApiFieldErrors(form, errors);
        },
      });
    },
  });

  const _update = useUpdateTableRow({
    onSuccess(): void {
      setIsDraft(false);
    },
    onError(error: AxiosError | Error): void {
      handleApiError(error, {
        context: 'Erro ao salvar o registro',
        onFieldErrors: (errors: Record<string, string>): void => {
          applyApiFieldErrors(form, errors);
        },
      });
    },
  });

  const _deleteDraft = useDeleteTableRow({
    onError(error: AxiosError | Error): void {
      handleApiError(error, { context: 'Erro ao descartar o rascunho' });
    },
  });

  const performSave = React.useCallback(async (): Promise<void> => {
    if (_autoSave.isPending) return;
    if (isUploading) return;

    const values = omitHiddenConditionalValues(
      form.state.values,
      fields,
      conditionalVisibility.hiddenFieldIds,
    );
    const payload = buildRowPayload(
      values,
      visibleFields.filter((f) => !relationshipSlugs.has(f.slug)),
    );

    await _autoSave.mutateAsync({
      slug,
      rowId: rowIdRef.current,
      data: payload,
    });
  }, [
    _autoSave,
    form,
    fields,
    visibleFields,
    relationshipSlugs,
    conditionalVisibility.hiddenFieldIds,
    slug,
    isUploading,
  ]);

  const canSaveCallback = React.useCallback((): boolean => {
    if (rowIdRef.current) return true;
    const visibleRequiredFields = requiredFields.filter(
      (field) => !conditionalVisibility.hiddenFieldIds.has(field._id),
    );
    if (visibleRequiredFields.length === 0) return false;
    return visibleRequiredFields.some((field): boolean => {
      const value = form.state.values[field.slug];
      return hasValue(value);
    });
  }, [form, requiredFields, conditionalVisibility.hiddenFieldIds]);

  const isDirtyCallback = React.useCallback((): boolean => {
    return isDirty;
  }, [isDirty]);

  const { status, lastSavedAt, triggerSave, cancelPending } = useAutoSave({
    onSave: performSave,
    isDraft,
    canSave: canSaveCallback,
    isDirty: isDirtyCallback,
  });

  triggerSaveRef.current = triggerSave;

  // Garante que o registro pai exista antes de adicionar itens a um grupo.
  // Sem rowId, dispara o auto-save (que persiste como rascunho via backend)
  // para obter o id e habilitar os cards do grupo.
  const ensureParentRow = React.useCallback(async (): Promise<
    string | undefined
  > => {
    cancelPending();
    if (rowIdRef.current) return rowIdRef.current;
    await performSave();
    return rowIdRef.current;
  }, [cancelPending, performSave]);

  // Ao abrir um registro novo, cria o rascunho de imediato (reusa o auto-save)
  // para que Salvar sempre publique via update e a seção de grupos já tenha o
  // rowId. Só para autenticado com CREATE_ROW: o endpoint de auto-save exige
  // auth, então tabela FORM pública/anônima mantém o create direto no Salvar.
  const eagerCreateRef = React.useRef<boolean>(false);
  React.useEffect((): void => {
    if (eagerCreateRef.current) return;
    if (!isNewRecord) return;
    if (!isAuthenticated) return;
    if (!permissions.can('CREATE_ROW')) return;
    if (rowIdRef.current) return;
    eagerCreateRef.current = true;
    void ensureParentRow();
  }, [isNewRecord, isAuthenticated, permissions, ensureParentRow]);

  const validateAndTouch = React.useCallback((): boolean => {
    const missing: Record<string, string> = {};
    const visibleRequiredFields = requiredFields.filter(
      (field) => !conditionalVisibility.hiddenFieldIds.has(field._id),
    );
    for (const field of visibleRequiredFields) {
      const value = form.state.values[field.slug];
      form.setFieldMeta(
        field.slug,
        (prev: AnyFieldMetaBase): AnyFieldMetaBase => ({
          ...prev,
          isTouched: true,
        }),
      );
      if (!hasValue(value)) {
        missing[field.slug] =
          resolveFieldLabel(field, 'form') + ' é obrigatório';
      }
    }
    // Grava os erros no slot `onServer` do errorMap — o único que a UI lê
    // (getFieldInvalidState) e que useApiErrorAutoClear limpa ao digitar.
    applyApiFieldErrors(form, missing);
    // Required por lado de relacionamento: exige ≥1 vínculo (contagem reportada
    // pelo repetidor), já que o valor não está no form.
    let relationshipMissing = false;
    for (const relField of visibleFormRelationshipFields) {
      if (!relField.required) continue;
      const count = relationshipLinkCountRef.current[relField.slug] ?? 0;
      if (count === 0) relationshipMissing = true;
    }
    return Object.keys(missing).length === 0 && !relationshipMissing;
  }, [
    form,
    requiredFields,
    visibleFormRelationshipFields,
    conditionalVisibility.hiddenFieldIds,
  ]);

  // Rascunho novo é descartável ao sair quando o usuário não adicionou conteúdo
  // real: nenhum item de grupo e — sem obrigatórios, form intocado; com
  // obrigatórios, algum ainda faltando.
  const isDiscardableDraft = React.useCallback((): boolean => {
    if (!isNewRecord) return false;
    if (!rowIdRef.current) return false;
    if (childAddedRef.current) return false;
    const visibleRequiredFields = requiredFields.filter(
      (field) => !conditionalVisibility.hiddenFieldIds.has(field._id),
    );
    if (visibleRequiredFields.length === 0) return !isDirty;
    return visibleRequiredFields.some((field): boolean => {
      return !hasValue(form.state.values[field.slug]);
    });
  }, [
    isNewRecord,
    requiredFields,
    form,
    isDirty,
    conditionalVisibility.hiddenFieldIds,
  ]);

  const finishAndBack = React.useCallback((): void => {
    // Sincroniza o cache uma unica vez ao sair (em vez de a cada save).
    queryClient.invalidateQueries({ queryKey: queryKeys.rows.lists(slug) });
    if (rowIdRef.current) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.rows.detail(slug, rowIdRef.current),
      });
    }
    onBack?.();
  }, [queryClient, slug, onBack]);

  const handleSaveAndBack = async (): Promise<void> => {
    cancelPending();
    // Salvar valida os obrigatorios e BLOQUEIA se invalido (auto-save e a
    // excecao que permite rascunho). Quando valido, chama create/update reais
    // que aplicam o guard do backend e publicam o registro.
    const isValid = validateAndTouch();
    if (!isValid) {
      setMissingRequired(true);
      return;
    }
    setMissingRequired(false);

    const payload = buildRowPayload(
      form.state.values,
      fields.filter((f) => !relationshipSlugs.has(f.slug)),
    );

    try {
      // Autenticado: garante o rascunho (caso o eager-create ainda esteja
      // pendente/tenha falhado) para que Salvar sempre publique via update.
      if (
        !rowIdRef.current &&
        isAuthenticated &&
        permissions.can('CREATE_ROW')
      ) {
        await ensureParentRow();
      }
      if (rowIdRef.current) {
        await _update.mutateAsync({
          slug,
          rowId: rowIdRef.current,
          data: payload,
        });
      } else {
        // Fluxo anônimo (tabela FORM pública): cria e publica direto.
        await _create.mutateAsync({ slug, data: payload });
      }
    } catch {
      // Erros de campo ja foram aplicados no form via onError dos hooks.
      // Mantem o usuario no formulario para correcao (nao navega).
      return;
    }

    finishAndBack();
  };

  const handleFillFields = React.useCallback(
    (data: Record<string, string | null>): void => {
      const fieldSlugs = new Set(fields.map((field) => field.slug));
      for (const [key, value] of Object.entries(data)) {
        if (value === null || !fieldSlugs.has(key)) continue;
        form.setFieldValue(key, value);
      }
      triggerSave();
    },
    [fields, form, triggerSave],
  );

  const requestBack = React.useCallback((): void => {
    cancelPending();
    if (isDiscardableDraft()) {
      setConfirmDiscardOpen(true);
      return;
    }
    finishAndBack();
  }, [cancelPending, isDiscardableDraft, finishAndBack]);

  // Permite que o botao Voltar do cabecalho (renderizado pelo componente pai)
  // passe pela mesma guarda de descarte do rascunho.
  if (backGuardRef) {
    backGuardRef.current = requestBack;
  }

  const confirmDiscard = async (): Promise<void> => {
    if (rowIdRef.current) {
      await _deleteDraft.mutateAsync({ slug, rowId: rowIdRef.current });
    }
    setConfirmDiscardOpen(false);
    onBack?.();
  };

  if (!initialRowId && !permissions.can('CREATE_ROW')) {
    return <AccessDenied />;
  }

  if (initialRowId && !permissions.can('UPDATE_ROW')) {
    return <AccessDenied />;
  }

  let displayStatus = status;
  if (missingRequired) {
    displayStatus = 'draft';
  }

  return (
    <React.Fragment>
      <div className="shrink-0 px-4 py-2 flex items-center justify-between gap-2 border-b">
        <AutoSaveStatusIndicator
          status={displayStatus}
          lastSavedAt={lastSavedAt}
        />
        <div className="flex items-center gap-2 shrink-0">
          {isDraft && (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-400"
            >
              Rascunho
            </Badge>
          )}
          <ExtensionSlot
            id="table.row.create"
            context={{
              table,
              slug,
              onFillFields: handleFillFields,
            }}
          />
        </div>
      </div>

      <form
        className="flex-1 flex flex-col min-h-0 overflow-auto relative"
        data-test-id="auto-save-row-form"
        onSubmit={(e: React.FormEvent<HTMLFormElement>): void => {
          e.preventDefault();
        }}
      >
        {conditionalConfig.status === 'pending' && (
          <div className="flex min-h-40 flex-1 items-center justify-center">
            <Spinner className="opacity-50" />
          </div>
        )}

        {conditionalConfig.status !== 'pending' && (
          <RowFormFields
            form={form}
            fields={visibleFields}
            tableSlug={slug}
            disabled={false}
            rowId={persistedRowId}
          />
        )}

        {conditionalConfig.status !== 'pending' &&
          visibleFormGroupFields.length > 0 && (
            <div className="flex flex-col gap-6 px-2 pb-4 pt-2 border-t mt-2">
              {visibleFormGroupFields.map(
                (groupField): React.JSX.Element => (
                  <GroupRowsInline
                    key={groupField._id}
                    tableSlug={slug}
                    rowId={persistedRowId}
                    field={groupField}
                    table={table}
                    initialItems={groupItemsOf(existingRow, groupField.slug)}
                    onEnsureParentRow={ensureParentRow}
                    onChildAdded={(): void => {
                      childAddedRef.current = true;
                    }}
                  />
                ),
              )}
            </div>
          )}

        {conditionalConfig.status !== 'pending' &&
          visibleFormRelationshipFields.length > 0 && (
            <div className="flex flex-col gap-6 px-2 pb-4 pt-2 border-t mt-2">
              {visibleFormRelationshipFields.map(
                (relField): React.JSX.Element => (
                  <RelationshipRowsInline
                    key={relField._id}
                    field={relField}
                    parentTableSlug={slug}
                    rowId={persistedRowId}
                    canEdit={true}
                    onEnsureParentRow={ensureParentRow}
                    onChildAdded={(): void => {
                      childAddedRef.current = true;
                    }}
                    onLinkCountChange={(count: number): void =>
                      handleLinkCountChange(relField.slug, count)
                    }
                  />
                ),
              )}
            </div>
          )}
      </form>

      <div className="shrink-0 px-4 py-3 flex justify-end gap-2 border-t">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={_create.isPending || _update.isPending}
          onClick={requestBack}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={_create.isPending || _update.isPending || isUploading}
          onClick={(): void => {
            void handleSaveAndBack();
          }}
        >
          {(_create.isPending || _update.isPending) && <Spinner />}
          <span>Salvar</span>
        </Button>
      </div>

      <Dialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar rascunho?</DialogTitle>
            <DialogDescription>
              Este registro foi salvo como rascunho e ainda não foi concluído.
              Deseja descartá-lo ou mantê-lo como rascunho?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={_deleteDraft.isPending}
              onClick={(): void => {
                setConfirmDiscardOpen(false);
                finishAndBack();
              }}
            >
              Manter rascunho
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={_deleteDraft.isPending}
              onClick={(): void => {
                void confirmDiscard();
              }}
            >
              {_deleteDraft.isPending && <Spinner />}
              <span>Descartar</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
