import { useSuspenseQuery } from '@tanstack/react-query';
import { createLazyFileRoute } from '@tanstack/react-router';
import {
  AlertTriangleIcon,
  PackageIcon,
  PuzzleIcon,
  SettingsIcon,
  WrenchIcon,
} from 'lucide-react';
import React from 'react';

import { TableMultiSelect } from '@/components/common/dynamic-table/table-selectors/table-multi-select';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { RowAccessConfigSheet } from '@/components/extensions/row-access/row-access-config-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { extensionListOptions } from '@/hooks/tanstack-query/_query-options';
import { useExtensionConfigureTableScope } from '@/hooks/tanstack-query/use-extension-configure-table-scope';
import { useExtensionToggle } from '@/hooks/tanstack-query/use-extension-toggle';
import { EXTENSION_TYPE_LABEL, E_EXTENSION_TYPE } from '@/lib/constant';
import { handleApiError } from '@/lib/handle-api-error';
import type { IExtension } from '@/lib/interfaces';
import { toastSuccess } from '@/lib/toast';

export const Route = createLazyFileRoute('/_private/extensions/')({
  component: RouteComponent,
});

const ROW_ACCESS_PLUGIN_KEY = 'core:row-access';

function isRowAccessPlugin(extension: IExtension): boolean {
  return `${extension.pkg}:${extension.extensionId}` === ROW_ACCESS_PLUGIN_KEY;
}

function TypeBadge({ type }: { type: IExtension['type'] }): React.JSX.Element {
  const Icon =
    type === E_EXTENSION_TYPE.PLUGIN
      ? PuzzleIcon
      : type === E_EXTENSION_TYPE.TOOL
        ? WrenchIcon
        : PackageIcon;

  return (
    <Badge
      variant="secondary"
      className="gap-1"
    >
      <Icon className="size-3" />
      {EXTENSION_TYPE_LABEL[type]}
    </Badge>
  );
}

function groupByPackage(
  extensions: Array<IExtension>,
): Array<{ pkg: string; items: Array<IExtension> }> {
  const groups = new Map<string, Array<IExtension>>();
  for (const extension of extensions) {
    const list = groups.get(extension.pkg) ?? [];
    list.push(extension);
    groups.set(extension.pkg, list);
  }
  return Array.from(groups.entries())
    .map(([pkg, items]) => ({ pkg, items }))
    .sort((a, b) => a.pkg.localeCompare(b.pkg));
}

interface ExtensionCardProps {
  extension: IExtension;
  onConfigureTableScope: (extension: IExtension) => void;
  onConfigureRowAccess: (
    extension: IExtension,
    initialTableId?: string,
  ) => void;
}

function ExtensionCard({
  extension,
  onConfigureTableScope,
  onConfigureRowAccess,
}: ExtensionCardProps): React.JSX.Element {
  const toggle = useExtensionToggle({
    onSuccess(_data) {
      toastSuccess(
        _data.enabled ? 'Extensão ativada' : 'Extensão desativada',
        extension.name,
      );
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao alternar extensão' });
    },
  });

  const isPending = toggle.status === 'pending';
  const canEnable = extension.available;

  const tableScopeLabel = ((): string | null => {
    if (extension.type !== E_EXTENSION_TYPE.PLUGIN) return null;
    if (extension.tableScope.mode === 'all') return 'Todas as tabelas';
    const count = extension.tableScope.tableIds.length;
    return `${count} tabela${count === 1 ? '' : 's'} selecionada${count === 1 ? '' : 's'}`;
  })();

  return (
    <Card
      data-test-id={`extension-card-${extension._id}`}
      className="flex flex-col"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2">
              <span className="truncate">{extension.name}</span>
              <TypeBadge type={extension.type} />
            </CardTitle>
            <CardDescription className="mt-1">
              {extension.description ?? 'Sem descrição'}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPending && <Spinner />}
            <Switch
              checked={extension.enabled}
              disabled={isPending || !canEnable}
              onCheckedChange={(enabled) =>
                toggle.mutate({ _id: extension._id, enabled })
              }
              data-test-id={`extension-toggle-${extension._id}`}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span>v{extension.version}</span>
          {extension.author && <span>• {extension.author}</span>}
          <span className="font-mono text-xs">
            {extension.pkg}/{extension.extensionId}
          </span>
        </div>

        {!extension.available && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangleIcon className="size-4" />
            <span>
              Indisponível: o manifest não foi encontrado no boot atual
            </span>
          </div>
        )}

        {extension.type === E_EXTENSION_TYPE.PLUGIN && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <div>
              <span className="text-xs uppercase tracking-wide">Escopo</span>
              <div className="text-foreground">{tableScopeLabel}</div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                isRowAccessPlugin(extension)
                  ? onConfigureRowAccess(extension)
                  : onConfigureTableScope(extension)
              }
              data-test-id={`extension-configure-${extension._id}`}
            >
              <SettingsIcon className="size-4" />
              Configurar
            </Button>
          </div>
        )}

        {isRowAccessPlugin(extension) &&
          extension.tableSettings &&
          Object.keys(extension.tableSettings).length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs uppercase tracking-wide mb-1">
                Tabelas configuradas
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.keys(extension.tableSettings).map((tableId) => (
                  <button
                    key={tableId}
                    type="button"
                    onClick={() => onConfigureRowAccess(extension, tableId)}
                    className="rounded-md border bg-muted/30 px-2 py-1 font-mono text-[10px] text-foreground hover:bg-muted transition-colors"
                    title={`Editar config dessa tabela individualmente`}
                  >
                    {tableId.slice(-8)}
                  </button>
                ))}
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}

interface TableScopeSheetProps {
  extension: IExtension | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TableScopeSheet({
  extension,
  open,
  onOpenChange,
}: TableScopeSheetProps): React.JSX.Element | null {
  const disableScopeAll = extension ? !extension.supportsScopeAll : false;

  const [mode, setMode] = React.useState<'all' | 'specific'>('all');
  const [tableIds, setTableIds] = React.useState<Array<string>>([]);

  React.useEffect(() => {
    if (!extension) return;
    setMode(
      !extension.supportsScopeAll && extension.tableScope.mode === 'all'
        ? 'specific'
        : extension.tableScope.mode,
    );
    setTableIds(extension.tableScope.tableIds);
  }, [extension]);

  const configure = useExtensionConfigureTableScope({
    onSuccess() {
      toastSuccess('Escopo atualizado', 'O plugin foi reconfigurado.');
      onOpenChange(false);
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao configurar escopo' });
    },
  });

  if (!extension) return null;

  const isPending = configure.status === 'pending';
  const canSave = mode === 'all' || tableIds.length > 0;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Escopo de {extension.name}</SheetTitle>
          <SheetDescription>
            Defina em quais tabelas este plugin deve aparecer.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-4">
          <Field>
            <FieldLabel>Modo</FieldLabel>
            <div className="space-y-2">
              <label
                className={`flex items-center gap-2 text-sm ${disableScopeAll ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                <input
                  type="radio"
                  checked={mode === 'all'}
                  onChange={() => setMode('all')}
                  disabled={isPending || disableScopeAll}
                />
                <span>Todas as tabelas</span>
              </label>
              {disableScopeAll && (
                <p className="text-xs text-muted-foreground pl-5">
                  Este plugin requer seleção explícita de tabelas.
                </p>
              )}
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  checked={mode === 'specific'}
                  onChange={() => setMode('specific')}
                  disabled={isPending}
                />
                <span>Tabelas específicas</span>
              </label>
            </div>
          </Field>

          {mode === 'specific' && (
            <Field>
              <FieldLabel>Tabelas</FieldLabel>
              <TableMultiSelect
                value={tableIds}
                onValueChange={(value) => setTableIds(value)}
                placeholder="Selecione tabelas..."
                disabled={isPending}
              />
            </Field>
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
            disabled={!canSave || isPending}
            onClick={() =>
              configure.mutate({
                _id: extension._id,
                mode,
                tableIds: mode === 'specific' ? tableIds : [],
              })
            }
            data-test-id="extension-scope-save-btn"
          >
            {isPending && <Spinner />}
            Salvar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function RouteComponent(): React.JSX.Element {
  const { data } = useSuspenseQuery(extensionListOptions());

  const [scopeExtension, setScopeExtension] = React.useState<IExtension | null>(
    null,
  );
  const [scopeOpen, setScopeOpen] = React.useState(false);

  const [rowAccessExtension, setRowAccessExtension] =
    React.useState<IExtension | null>(null);
  const [rowAccessOpen, setRowAccessOpen] = React.useState(false);
  const [rowAccessInitialTableId, setRowAccessInitialTableId] = React.useState<
    string | undefined
  >(undefined);

  const groups = React.useMemo(() => groupByPackage(data), [data]);

  const handleConfigureTableScope = React.useCallback(
    (extension: IExtension) => {
      setScopeExtension(extension);
      setScopeOpen(true);
    },
    [],
  );

  const handleConfigureRowAccess = React.useCallback(
    (extension: IExtension, initialTableId?: string) => {
      setRowAccessExtension(extension);
      setRowAccessInitialTableId(initialTableId);
      setRowAccessOpen(true);
    },
    [],
  );

  return (
    <PageShell data-test-id="extensions-page">
      <PageShell.Header>
        <PageHeader title="Extensões">
          <Badge variant="outline">{data.length} registrada(s)</Badge>
        </PageHeader>
      </PageShell.Header>

      <PageShell.Content className="p-4">
        {data.length === 0 && (
          <Empty>
            <EmptyTitle>Nenhuma extensão registrada</EmptyTitle>
            <EmptyDescription>
              Adicione manifestos em <code>backend/extensions/</code> seguindo a
              estrutura <code>{'<pacote>/<plugins|modules|tools>/<id>'}</code>.
              O loader varre o diretório no boot e popula esta lista.
            </EmptyDescription>
          </Empty>
        )}

        {groups.map((group) => (
          <section
            key={group.pkg}
            className="mb-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {group.pkg}
            </h2>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((extension) => (
                <ExtensionCard
                  key={extension._id}
                  extension={extension}
                  onConfigureTableScope={handleConfigureTableScope}
                  onConfigureRowAccess={handleConfigureRowAccess}
                />
              ))}
            </div>
          </section>
        ))}
      </PageShell.Content>

      <TableScopeSheet
        extension={scopeExtension}
        open={scopeOpen}
        onOpenChange={setScopeOpen}
      />

      <RowAccessConfigSheet
        extension={rowAccessExtension}
        open={rowAccessOpen}
        onOpenChange={(o) => {
          setRowAccessOpen(o);
          if (!o) setRowAccessInitialTableId(undefined);
        }}
        initialTableId={rowAccessInitialTableId}
      />
    </PageShell>
  );
}
