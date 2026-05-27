import React from 'react';

import { DateWindowModeSelector } from './date-window-mode-selector';
import { RoleMatrix } from './role-matrix';
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
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { useExtensionBulkConfigureTableSettings } from '@/hooks/tanstack-query/use-extension-bulk-configure-table-settings';
import { handleApiError } from '@/lib/handle-api-error';
import type { IExtension } from '@/lib/interfaces';
import { toastError, toastSuccess } from '@/lib/toast';

interface RowAccessConfigSheetProps {
  extension: IExtension | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando definido, pré-carrega a config dessa tabela ao abrir (modo "editar"). */
  initialTableId?: string;
}

function deriveInitialSettings(
  extension: IExtension | null,
  initialTableId: string | undefined,
): RowAccessSettings {
  if (!extension?.tableSettings) return DEFAULT_ROW_ACCESS_SETTINGS;
  const target =
    initialTableId && extension.tableSettings[initialTableId]
      ? extension.tableSettings[initialTableId]
      : Object.values(extension.tableSettings)[0];
  if (isRowAccessSettings(target)) {
    return target;
  }
  return DEFAULT_ROW_ACCESS_SETTINGS;
}

export function RowAccessConfigSheet({
  extension,
  open,
  onOpenChange,
  initialTableId,
}: RowAccessConfigSheetProps): React.JSX.Element | null {
  const [tableIds, setTableIds] = React.useState<Array<string>>([]);
  const [settings, setSettings] = React.useState<RowAccessSettings>(
    DEFAULT_ROW_ACCESS_SETTINGS,
  );
  const [conflictError, setConflictError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!extension) return;
    setSettings(deriveInitialSettings(extension, initialTableId));
    if (initialTableId) {
      setTableIds([initialTableId]);
    } else {
      setTableIds(extension.tableScope?.tableIds ?? []);
    }
    setConflictError(null);
  }, [extension, initialTableId, open]);

  const mutation = useExtensionBulkConfigureTableSettings({
    onSuccess(data) {
      setConflictError(null);
      if (data.failed.length === 0) {
        toastSuccess(
          'Configuração salva',
          `Aplicada em ${data.success.length} tabela(s).`,
        );
        onOpenChange(false);
      } else {
        toastError(
          'Algumas tabelas falharam',
          `${data.success.length} sucessos, ${data.failed.length} falhas. Veja detalhes no console.`,
        );
        console.warn('[row-access bulk apply] failed:', data.failed);
      }
    },
    onError(error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 409) {
        setConflictError(
          'Configuração modificada por outro usuário. Recarregue a página e tente novamente.',
        );
        return;
      }
      handleApiError(error, { context: 'Erro ao configurar Row Access' });
    },
  });

  if (!extension) return null;
  const ext = extension; // narrow para closures
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
      for (const v of settings.visibility.values) {
        const roles = settings.visibility.roleMatrix[v] ?? [];
        if (!roles.includes('MASTER') || !roles.includes('ADMINISTRATOR')) {
          return `Valor '${v}': MASTER e ADMINISTRATOR são obrigatórios.`;
        }
      }
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
      toastError('Validação', validationError);
      return;
    }
    const ts = ext.updatedAt ?? ext.createdAt;
    const expectedUpdatedAt =
      ts && typeof ts === 'object' && 'toISOString' in ts
        ? (ts as Date).toISOString()
        : String(ts ?? '');
    mutation.mutate({
      extensionId: ext._id,
      tableIds,
      settings: settings as unknown as Record<string, unknown>,
      expectedUpdatedAt,
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent
        className="sm:max-w-2xl overflow-y-auto"
        // Impede que o Sheet capture cliques destinados aos portals filhos
        // (TableMultiSelect's Combobox = @base-ui/react, DropdownMenu, Select).
        // e.target é o SheetContent (onde o CustomEvent do Radix é despachado),
        // não o elemento clicado — o alvo real está em e.detail.originalEvent.target.
        onPointerDownOutside={(e) => {
          const target =
            ((e as unknown as CustomEvent<{ originalEvent?: EventTarget }>)
              .detail?.originalEvent as Element | null) ??
            (e.target as Element | null);
          if (
            target?.closest?.(
              '[data-base-ui-portal], [data-slot="combobox-content"], [data-slot="combobox-list"], [data-slot="combobox-item"], [data-radix-popper-content-wrapper], [role="listbox"], [role="menu"], [role="option"]',
            )
          ) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target =
            ((e as unknown as CustomEvent<{ originalEvent?: EventTarget }>)
              .detail?.originalEvent as Element | null) ??
            (e.target as Element | null);
          if (
            target?.closest?.(
              '[data-base-ui-portal], [data-slot="combobox-content"], [data-slot="combobox-list"], [data-slot="combobox-item"], [data-radix-popper-content-wrapper], [role="listbox"], [role="menu"], [role="option"]',
            )
          ) {
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
                Visibilidade por papel
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
                  matrix={settings.visibility.roleMatrix}
                  onChange={(values, matrix) =>
                    setSettings((p) => ({
                      ...p,
                      visibility: {
                        ...p.visibility,
                        values,
                        roleMatrix: matrix,
                        defaultValue: values.includes(p.visibility.defaultValue)
                          ? p.visibility.defaultValue
                          : values[0],
                      },
                    }))
                  }
                  disabled={isPending}
                />

                <Field>
                  <FieldLabel>Matriz de acesso</FieldLabel>
                  <RoleMatrix
                    values={settings.visibility.values}
                    matrix={settings.visibility.roleMatrix}
                    onChange={(m) => setVisibility('roleMatrix', m)}
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
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
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
