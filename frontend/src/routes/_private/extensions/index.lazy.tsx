import { useSuspenseQuery } from '@tanstack/react-query';
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import {
  AlertTriangleIcon,
  LayoutDashboardIcon,
  LayoutListIcon,
  PackageIcon,
  PuzzleIcon,
  SearchIcon,
  SettingsIcon,
  WrenchIcon,
  XIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { TableMultiSelect } from '@/components/common/dynamic-table/table-selectors/table-multi-select';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { ConfiguredTablesList } from '@/components/extensions/row-access/configured-tables-list';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
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
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { extensionListOptions } from '@/hooks/tanstack-query/_query-options';
import { useExtensionConfigureTableScope } from '@/hooks/tanstack-query/use-extension-configure-table-scope';
import { useExtensionToggle } from '@/hooks/tanstack-query/use-extension-toggle';
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import {
  EXTENSION_TYPE_LABEL,
  E_AREA_CAPABILITY,
  E_EXTENSION_TYPE,
} from '@/lib/constant';
import { handleApiError } from '@/lib/handle-api-error';
import type { IExtension, Merge } from '@/lib/interfaces';
import { hasAreaCapability } from '@/lib/menu/menu-access-permissions';
import { useAuthStore } from '@/stores/authentication';

export const Route = createLazyFileRoute('/_private/extensions/')({
  component: RouteComponent,
});

const ROW_ACCESS_PLUGIN_KEY = 'core:row-access';

function isRowAccessPlugin(extension: IExtension): boolean {
  return `${extension.pkg}:${extension.extensionId}` === ROW_ACCESS_PLUGIN_KEY;
}

function TypeBadge({ type }: { type: IExtension['type'] }): React.JSX.Element {
  let Icon = PackageIcon;
  if (type === E_EXTENSION_TYPE.PLUGIN) Icon = PuzzleIcon;
  if (type === E_EXTENSION_TYPE.TOOL) Icon = WrenchIcon;

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

function getTableScopeLabel(extension: IExtension): string | null {
  if (extension.type !== E_EXTENSION_TYPE.PLUGIN) return null;
  if (extension.tableScope.mode === 'all') return 'Todas as tabelas';
  const count = extension.tableScope.tableIds.length;
  let plural = 's';
  if (count === 1) plural = '';
  return `${count} tabela${plural} selecionada${plural}`;
}

type ExtensionCardProps = {
  extension: IExtension;
  canConfigurePlugins: boolean;
  onConfigureTableScope: (extension: IExtension) => void;
  onConfigureRowAccess: (
    extension: IExtension,
    initialTableId?: string,
  ) => void;
};

function ExtensionCard({
  extension,
  canConfigurePlugins,
  onConfigureTableScope,
  onConfigureRowAccess,
}: ExtensionCardProps): React.JSX.Element {
  const navigate = useNavigate();
  const toggle = useExtensionToggle({
    onSuccess(_data) {
      let message = 'Extensão desativada';
      if (_data.enabled) message = 'Extensão ativada';
      toast.success(message, { description: extension.name });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao alternar extensão' });
    },
  });

  const isPending = toggle.status === 'pending';
  const canEnable = extension.available;

  const tableScopeLabel = getTableScopeLabel(extension);

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
            {canConfigurePlugins && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => {
                  if (isRowAccessPlugin(extension)) {
                    onConfigureRowAccess(extension);
                  } else {
                    onConfigureTableScope(extension);
                  }
                }}
                data-test-id={`extension-configure-${extension._id}`}
              >
                <SettingsIcon className="size-4" />
                Configurar
              </Button>
            )}
          </div>
        )}

        {isRowAccessPlugin(extension) &&
          extension.tableScope.mode === 'specific' &&
          extension.tableScope.tableIds.length > 0 && (
            <div className="pt-2 border-t">
              <ConfiguredTablesList
                tableIds={extension.tableScope.tableIds}
                onClick={(tableId) => onConfigureRowAccess(extension, tableId)}
              />
            </div>
          )}

        {extension.type !== E_EXTENSION_TYPE.PLUGIN &&
          extension.configRoute && (
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                data-test-id={`extension-config-route-${extension._id}`}
                onClick={() =>
                  // @ts-expect-error configRoute e uma rota dinamica (string)
                  navigate({ to: extension.configRoute })
                }
              >
                <SettingsIcon className="size-4" />
                Configurar
              </Button>
            </div>
          )}
      </CardContent>
    </Card>
  );
}

type ExtensionTableRowProps = {
  extension: IExtension;
  canConfigurePlugins: boolean;
  onConfigureTableScope: (extension: IExtension) => void;
  onConfigureRowAccess: (
    extension: IExtension,
    initialTableId?: string,
  ) => void;
};

function ExtensionTableRow({
  extension,
  canConfigurePlugins,
  onConfigureTableScope,
  onConfigureRowAccess,
}: ExtensionTableRowProps): React.JSX.Element {
  const navigate = useNavigate();
  const toggle = useExtensionToggle({
    onSuccess(_data) {
      let message = 'Extensão desativada';
      if (_data.enabled) message = 'Extensão ativada';
      toast.success(message, { description: extension.name });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao alternar extensão' });
    },
  });

  const isPending = toggle.status === 'pending';
  const tableScopeLabel = getTableScopeLabel(extension);

  return (
    <TableRow data-test-id={`extension-table-row-${extension._id}`}>
      <TableCell className="min-w-72">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-medium">
            <span>{extension.name}</span>
            {!extension.available && (
              <AlertTriangleIcon className="size-4 text-destructive" />
            )}
          </div>
          <div className="max-w-xl text-sm text-muted-foreground whitespace-normal">
            {extension.description ?? 'Sem descrição'}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <TypeBadge type={extension.type} />
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="font-mono text-xs">{extension.pkg}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {extension.extensionId}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        v{extension.version}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {extension.author ?? '-'}
      </TableCell>
      <TableCell>
        {tableScopeLabel && <span className="text-sm">{tableScopeLabel}</span>}
        {!tableScopeLabel && <span className="text-muted-foreground">-</span>}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {isPending && <Spinner />}
          <Switch
            checked={extension.enabled}
            disabled={isPending || !extension.available}
            onCheckedChange={(enabled) =>
              toggle.mutate({ _id: extension._id, enabled })
            }
            data-test-id={`extension-table-toggle-${extension._id}`}
          />
        </div>
      </TableCell>
      <TableCell className="text-right">
        {extension.type === E_EXTENSION_TYPE.PLUGIN && canConfigurePlugins && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => {
              if (isRowAccessPlugin(extension)) {
                onConfigureRowAccess(extension);
              } else {
                onConfigureTableScope(extension);
              }
            }}
            data-test-id={`extension-table-configure-${extension._id}`}
          >
            <SettingsIcon className="size-4" />
            Configurar
          </Button>
        )}

        {extension.type !== E_EXTENSION_TYPE.PLUGIN &&
          extension.configRoute && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              data-test-id={`extension-table-config-route-${extension._id}`}
              onClick={() =>
                // @ts-expect-error configRoute e uma rota dinamica (string)
                navigate({ to: extension.configRoute })
              }
            >
              <SettingsIcon className="size-4" />
              Configurar
            </Button>
          )}
      </TableCell>
    </TableRow>
  );
}

type TableScopeSheetProps = Merge<
  React.ComponentProps<typeof SheetTrigger>,
  {
    extension: IExtension | null;
  }
>;

function TableScopeSheet({
  ref,
  extension,
  ...rest
}: TableScopeSheetProps): React.JSX.Element | null {
  const { closeRef, close } = useDismissableDialog();
  const [mode, setMode] = React.useState<'all' | 'specific'>('all');
  const [tableIds, setTableIds] = React.useState<Array<string>>([]);

  React.useEffect(() => {
    if (!extension) return;
    setMode(extension.tableScope.mode);
    setTableIds(extension.tableScope.tableIds);
  }, [extension]);

  const configure = useExtensionConfigureTableScope({
    onSuccess() {
      toast.success('Escopo atualizado', {
        description: 'O plugin foi reconfigurado.',
      });
      close();
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao configurar escopo' });
    },
  });

  if (!extension) return null;

  const isPending = configure.status === 'pending';
  const canSave = mode === 'all' || tableIds.length > 0;

  return (
    <Sheet>
      <SheetTrigger
        {...rest}
        ref={ref}
      />
      <SheetContent
        className="sm:max-w-md"
        onInteractOutside={(e) => {
          // Combobox (base-ui) renderiza popup via Portal fora do SheetContent.
          // Sem isso, clicar numa opção fecha o Sheet por "click outside".
          let target: HTMLElement | null = null;
          if (e.target instanceof HTMLElement) target = e.target;
          if (target?.closest('[data-slot="combobox-content"]')) {
            e.preventDefault();
          }
        }}
      >
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
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  checked={mode === 'all'}
                  onChange={() => setMode('all')}
                  disabled={isPending}
                />
                <span>Todas as tabelas</span>
              </label>
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
            disabled={!canSave || isPending}
            onClick={() => {
              let scopeTableIds: typeof tableIds = [];
              if (mode === 'specific') scopeTableIds = tableIds;
              configure.mutate({
                _id: extension._id,
                mode,
                tableIds: scopeTableIds,
              });
            }}
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

type StatusFilter = 'all' | 'enabled' | 'disabled';
type TypeFilter = IExtension['type'];
type ViewMode = 'gallery' | 'table';

const TYPE_FILTERS: Array<TypeFilter> = [
  E_EXTENSION_TYPE.PLUGIN,
  E_EXTENSION_TYPE.MODULE,
  E_EXTENSION_TYPE.TOOL,
];

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'enabled', label: 'Ativas' },
  { value: 'disabled', label: 'Desativadas' },
];

function RouteComponent(): React.JSX.Element {
  const { data } = useSuspenseQuery(extensionListOptions());

  // Configurar escopo de plugin exige MANAGE_PLUGINS no backend
  // (configure-table-scope). A rota /extensions abre com MANAGE_TOOLS, entao o
  // botao so aparece para quem tambem tem MANAGE_PLUGINS — evita 403 ao salvar.
  const capabilities = useAuthStore((state) => state.user?.capabilities);
  const canConfigurePlugins = hasAreaCapability(
    capabilities,
    E_AREA_CAPABILITY.MANAGE_PLUGINS,
  );

  const [scopeExtension, setScopeExtension] = React.useState<IExtension | null>(
    null,
  );
  const [scopeNonce, setScopeNonce] = React.useState(0);
  const scopeTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  const [rowAccessExtension, setRowAccessExtension] =
    React.useState<IExtension | null>(null);
  const [rowAccessNonce, setRowAccessNonce] = React.useState(0);
  const rowAccessTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [rowAccessInitialTableId, setRowAccessInitialTableId] = React.useState<
    string | undefined
  >(undefined);

  React.useEffect(() => {
    if (scopeNonce > 0) scopeTriggerRef.current?.click();
  }, [scopeNonce]);

  React.useEffect(() => {
    if (rowAccessNonce > 0) rowAccessTriggerRef.current?.click();
  }, [rowAccessNonce]);

  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<Array<TypeFilter>>([]);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [viewMode, setViewMode] = React.useState<ViewMode>('gallery');

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((extension) => {
      if (typeFilter.length > 0 && !typeFilter.includes(extension.type)) {
        return false;
      }
      if (statusFilter === 'enabled' && !extension.enabled) return false;
      if (statusFilter === 'disabled' && extension.enabled) return false;
      if (term.length === 0) return true;
      const haystack = [
        extension.name,
        extension.description ?? '',
        extension.pkg,
        extension.extensionId,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [data, search, statusFilter, typeFilter]);

  const groups = React.useMemo(() => groupByPackage(filtered), [filtered]);

  const handleConfigureTableScope = React.useCallback(
    (extension: IExtension) => {
      setScopeExtension(extension);
      setScopeNonce((value) => value + 1);
    },
    [],
  );

  const handleConfigureRowAccess = React.useCallback(
    (extension: IExtension, initialTableId?: string) => {
      setRowAccessExtension(extension);
      setRowAccessInitialTableId(initialTableId);
      setRowAccessNonce((value) => value + 1);
    },
    [],
  );

  const toggleTypeFilter = React.useCallback((type: TypeFilter): void => {
    setTypeFilter((prev) => {
      if (prev.includes(type)) return prev.filter((t) => t !== type);
      return [...prev, type];
    });
  }, []);

  return (
    <PageShell data-test-id="extensions-page">
      <PageShell.Header className="flex-col items-stretch gap-3">
        <div className="flex items-center justify-between gap-2">
          <PageHeader title="Extensões">
            <Badge
              variant="outline"
              data-test-id="extensions-count-badge"
            >
              {filtered.length} de {data.length}
            </Badge>
          </PageHeader>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end lg:gap-3">
          <div className="lg:w-96">
            <InputGroup>
              <InputGroupAddon>
                <SearchIcon className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                data-test-id="extensions-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, descrição ou pacote..."
                className="shadow-none"
              />
              {search.length > 0 && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Limpar busca"
                    onClick={() => setSearch('')}
                    className="cursor-pointer"
                  >
                    <XIcon className="size-4" />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5"
            data-test-id="extensions-type-filter"
          >
            <span className="text-xs font-medium text-muted-foreground mr-1">
              Tipo:
            </span>
            {TYPE_FILTERS.map((type) => {
              const active = typeFilter.includes(type);
              let variant: 'default' | 'outline' = 'outline';
              if (active) variant = 'default';
              return (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant={variant}
                  className="h-7 px-2.5 cursor-pointer"
                  onClick={() => toggleTypeFilter(type)}
                  data-test-id={`extensions-type-${type.toLowerCase()}`}
                >
                  {EXTENSION_TYPE_LABEL[type]}
                </Button>
              );
            })}
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5"
            data-test-id="extensions-status-filter"
          >
            <span className="text-xs font-medium text-muted-foreground mr-1">
              Status:
            </span>
            {STATUS_FILTERS.map((option) => {
              const active = statusFilter === option.value;
              let variant: 'default' | 'outline' = 'outline';
              if (active) variant = 'default';
              return (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={variant}
                  className="h-7 px-2.5 cursor-pointer"
                  onClick={() => setStatusFilter(option.value)}
                  data-test-id={`extensions-status-${option.value}`}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>

          <DropdownMenu
            data-slot="extensions-view-mode"
            data-test-id="extensions-view-mode"
            dir="ltr"
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 cursor-pointer shadow-none"
              >
                {viewMode === 'gallery' && (
                  <LayoutDashboardIcon className="size-4" />
                )}
                {viewMode !== 'gallery' && (
                  <LayoutListIcon className="size-4" />
                )}
                Exibição
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-w-xs">
              <DropdownMenuRadioGroup value={viewMode}>
                <DropdownMenuRadioItem
                  value="table"
                  className="inline-flex w-full space-x-1"
                  onClick={() => setViewMode('table')}
                  data-test-id="extensions-view-table"
                >
                  <LayoutListIcon className="size-4" />
                  <span>Lista</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="gallery"
                  className="inline-flex w-full space-x-1"
                  onClick={() => setViewMode('gallery')}
                  data-test-id="extensions-view-gallery"
                >
                  <LayoutDashboardIcon className="size-4" />
                  <span>Galeria</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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

        {data.length > 0 && filtered.length === 0 && (
          <Empty>
            <EmptyTitle>Nenhum resultado</EmptyTitle>
            <EmptyDescription>
              Ajuste a busca ou os filtros para encontrar extensões.
            </EmptyDescription>
          </Empty>
        )}

        {viewMode === 'gallery' &&
          groups.map((group) => (
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
                    canConfigurePlugins={canConfigurePlugins}
                    onConfigureTableScope={handleConfigureTableScope}
                    onConfigureRowAccess={handleConfigureRowAccess}
                  />
                ))}
              </div>
            </section>
          ))}

        {viewMode === 'table' && filtered.length > 0 && (
          <div className="rounded-md border">
            <Table data-test-id="extensions-table-view">
              <TableHeader>
                <TableRow>
                  <TableHead>Extensão</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Pacote</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((extension) => (
                  <ExtensionTableRow
                    key={extension._id}
                    extension={extension}
                    canConfigurePlugins={canConfigurePlugins}
                    onConfigureTableScope={handleConfigureTableScope}
                    onConfigureRowAccess={handleConfigureRowAccess}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageShell.Content>

      <TableScopeSheet
        key={scopeNonce}
        ref={scopeTriggerRef}
        extension={scopeExtension}
      />

      <RowAccessConfigSheet
        key={rowAccessNonce}
        ref={rowAccessTriggerRef}
        extension={rowAccessExtension}
        initialTableId={rowAccessInitialTableId}
      />
    </PageShell>
  );
}
