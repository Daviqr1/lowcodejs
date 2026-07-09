import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { toast } from 'sonner';

import { DateWindowModeSelector } from './date-window-mode-selector';
import { GroupMatrix } from './group-matrix';
import { DEFAULT_ROW_ACCESS_SETTINGS, isRowAccessSettings } from './types';
import type { RowAccessSettings } from './types';
import { VisibilityValuesEditor } from './visibility-values-editor';

import { TableMultiSelect } from '@/components/common/dynamic-table/table-selectors/table-multi-select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { groupAllOptions } from '@/hooks/tanstack-query/_query-options';
import { useExtensionBulkConfigureTableSettings } from '@/hooks/tanstack-query/use-extension-bulk-configure-table-settings';
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import { handleApiError } from '@/lib/handle-api-error';
import type { IExtension, Merge } from '@/lib/interfaces';

type RowAccessConfigSheetProps = Merge<
  React.ComponentProps<typeof SheetTrigger>,
  {
    extension: IExtension | null;
    /** Quando definido, pré-carrega a config dessa tabela ao abrir (modo "editar"). */
    initialTableId?: string;
  }
>;

function getResponseStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if (!('response' in error)) return undefined;
  const response = error.response;
  if (typeof response !== 'object' || response === null) return undefined;
  if (!('status' in response)) return undefined;
  const status = response.status;
  if (typeof status === 'number') return status;
  return undefined;
}

// Resolve o elemento real de um evento "outside" do Sheet: prioriza o target do
// originalEvent (clique dentro de um portal) e cai para o target do evento.
function resolveOutsideTarget(
  originalEvent: Event,
  fallback: EventTarget | null,
): Element | null {
  if (originalEvent.target instanceof Element) return originalEvent.target;
  if (fallback instanceof Element) return fallback;
  return null;
}

const OUTSIDE_PORTAL_SELECTOR =
  '[data-base-ui-portal], [data-slot="combobox-content"], [data-slot="combobox-list"], [data-slot="combobox-item"], [data-radix-popper-content-wrapper], [role="listbox"], [role="menu"], [role="option"]';

function deriveInitialSettings(
  extension: IExtension | null,
  initialTableId: string | undefined,
): RowAccessSettings {
  if (!extension?.tableSettings) return DEFAULT_ROW_ACCESS_SETTINGS;
  let target = Object.values(extension.tableSettings)[0];
  if (initialTableId && extension.tableSettings[initialTableId]) {
    target = extension.tableSettings[initialTableId];
  }
  if (isRowAccessSettings(target)) {
    return target;
  }
  return DEFAULT_ROW_ACCESS_SETTINGS;
}

export function RowAccessConfigSheet({
  ref,
  extension,
  initialTableId,
  ...rest
}: RowAccessConfigSheetProps): React.JSX.Element | null {
  const { closeRef, close } = useDismissableDialog();
  const [tableIds, setTableIds] = React.useState<Array<string>>([]);
  const [settings, setSettings] = React.useState<RowAccessSettings>(
    DEFAULT_ROW_ACCESS_SETTINGS,
  );
  const [conflictError, setConflictError] = React.useState<string | null>(null);

  // Carrega todos os grupos para popular as colunas da GroupMatrix
  const groupsQuery = useQuery(groupAllOptions());
  const groups = groupsQuery.data ?? [];

  React.useEffect(() => {
    if (!extension) return;
    setSettings(deriveInitialSettings(extension, initialTableId));
    if (initialTableId) {
      setTableIds([initialTableId]);
    } else {
      setTableIds(extension.tableScope?.tableIds ?? []);
    }
    setConflictError(null);
  }, [extension, initialTableId]);

  const mutation = useExtensionBulkConfigureTableSettings({
    onSuccess(data) {
      setConflictError(null);
      if (data.failed.length === 0) {
        toast.success('Configuração salva', {
          description: `Aplicada em ${data.success.length} tabela(s).`,
        });
        close();
      } else {
        toast.error('Algumas tabelas falharam', {
          description: `${data.success.length} sucessos, ${data.failed.length} falhas. Veja detalhes no console.`,
        });
        console.warn('[row-access bulk apply] failed:', data.failed);
      }
    },
    onError(error) {
      if (getResponseStatus(error) === 409) {
        setConflictError(
          'Configuração modificada por outro usuário. Recarregue a página e tente novamente.',
        );
        return;
      }
      handleApiError(error, { context: 'Erro ao configurar Row Access' });
    },
  });

  if (!extension) return null;
  const ext = extension;
  const isPending = mutation.status === 'pending';

  function setVisibility<TKey extends keyof RowAccessSettings['visibility']>(
    key: TKey,
    value: RowAccessSettings['visibility'][TKey],
  ): void {
    setSettings((prev) => ({
      ...prev,
      visibility: { ...prev.visibility, [key]: value },
    }));
  }

  function validate(): string | null {
    if (tableIds.length === 0) return 'Selecione pelo menos uma tabela.';
    if (settings.visibility.enabled) {
      if (settings.visibility.values.length < 2)
        return 'visibility.values: mínimo 2 valores.';
      if (
        !settings.visibility.values.includes(settings.visibility.defaultValue)
      )
        return 'visibility.defaultValue precisa estar em values.';
    }
    if (settings.dateWindow.mode === 'createdAt-sliding') {
      if (
        !Number.isInteger(settings.dateWindow.slidingDays) ||
        settings.dateWindow.slidingDays < 1 ||
        settings.dateWindow.slidingDays > 3650
      )
        return 'dateWindow.slidingDays: entre 1 e 3650.';
    }
    return null;
  }

  function handleSave(): void {
    const validationError = validate();
    if (validationError) {
      toast.error('Validação', { description: validationError });
      return;
    }
    // Em runtime as datas chegam como string (JSON) apesar do tipo Date.
    const ts: unknown = ext.updatedAt ?? ext.createdAt;
    let expectedUpdatedAt = '';
    if (ts instanceof Date) {
      expectedUpdatedAt = ts.toISOString();
    } else if (ts != null) {
      expectedUpdatedAt = String(ts);
    }
    mutation.mutate({
      extensionId: ext._id,
      tableIds,
      settings: settings,
      expectedUpdatedAt,
    });
  }

  return (
    <Sheet>
      <SheetTrigger
        {...rest}
        ref={ref}
      />
      <SheetContent
        className="sm:max-w-2xl overflow-y-auto"
        // Impede que o Sheet capture cliques destinados aos portals filhos
        // (TableMultiSelect's Combobox = @base-ui/react, DropdownMenu, Select).
        onPointerDownOutside={(e) => {
          const target = resolveOutsideTarget(e.detail.originalEvent, e.target);
          if (target?.closest?.(OUTSIDE_PORTAL_SELECTOR)) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = resolveOutsideTarget(e.detail.originalEvent, e.target);
          if (target?.closest?.(OUTSIDE_PORTAL_SELECTOR)) {
            e.preventDefault();
          }
        }}
      >
        <SheetHeader>
          <SheetTitle>Configurar Controle de Acesso a Linhas</SheetTitle>
          <SheetDescription>
            Aplica a mesma configuração em todas as tabelas selecionadas.
            Visibility, bypass do criador e janela temporal são configuráveis.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 py-2">
          {/* Tabelas alvo */}
          <Field>
            <FieldLabel>Tabelas alvo</FieldLabel>
            <TableMultiSelect
              value={tableIds}
              onValueChange={(v) => setTableIds(v)}
              placeholder="Selecione tabelas..."
              disabled={isPending}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {tableIds.length} tabela(s) selecionada(s). A config será aplicada
              em todas via 1 chamada (bulk).
            </p>
          </Field>

          <hr />

          {/* Visibilidade */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Visibilidade por grupo
              </h3>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.visibility.enabled}
                  onCheckedChange={(c) => setVisibility('enabled', Boolean(c))}
                  disabled={isPending}
                />
                Ativa
              </label>
            </div>

            {settings.visibility.enabled && (
              <>
                <VisibilityValuesEditor
                  values={settings.visibility.values}
                  matrix={settings.visibility.groupMatrix}
                  onChange={(values, matrix) =>
                    setSettings((p) => {
                      let defaultValue = values[0];
                      if (values.includes(p.visibility.defaultValue)) {
                        defaultValue = p.visibility.defaultValue;
                      }
                      return {
                        ...p,
                        visibility: {
                          ...p.visibility,
                          values,
                          groupMatrix: matrix,
                          defaultValue,
                        },
                      };
                    })
                  }
                  disabled={isPending}
                />

                <Field>
                  <FieldLabel>Matriz de acesso (valor × grupo)</FieldLabel>
                  <GroupMatrix
                    values={settings.visibility.values}
                    matrix={settings.visibility.groupMatrix}
                    groups={groups}
                    onChange={(m) => setVisibility('groupMatrix', m)}
                    disabled={isPending}
                  />
                </Field>

                <Field>
                  <FieldLabel>Valor padrão (rows novas e backfill)</FieldLabel>
                  <Select
                    value={settings.visibility.defaultValue}
                    onValueChange={(v) => setVisibility('defaultValue', v)}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.visibility.values.map((v) => (
                        <SelectItem
                          key={v}
                          value={v}
                        >
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </>
            )}
          </div>

          <hr />

          {/* Creator bypass */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Bypass do criador
            </h3>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={settings.creatorBypass.enabled}
                onCheckedChange={(c) =>
                  setSettings((p) => ({
                    ...p,
                    creatorBypass: { enabled: Boolean(c) },
                  }))
                }
                disabled={isPending}
              />
              <span>
                Criadores sempre veem e podem editar/deletar suas próprias rows
              </span>
            </label>
          </div>

          <hr />

          {/* Date window */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Janela temporal
            </h3>
            <DateWindowModeSelector
              value={settings.dateWindow}
              onChange={(v) =>
                setSettings((prev) => ({ ...prev, dateWindow: v }))
              }
              disabled={isPending}
            />
          </div>

          {conflictError && (
            <p
              role="alert"
              className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {conflictError}
            </p>
          )}
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button
              ref={closeRef}
              type="button"
              variant="outline"
              disabled={isPending}
            >
              Cancelar
            </Button>
          </SheetClose>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || tableIds.length === 0}
            data-test-id="row-access-save-btn"
          >
            {isPending && <Spinner />}
            Salvar em {tableIds.length} tabela(s)
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
