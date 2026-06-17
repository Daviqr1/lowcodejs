import {
  createLazyFileRoute,
  getRouteApi,
  useParams,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import type { AxiosError } from 'axios';
import { ArrowLeftIcon, PlusIcon, Share2Icon, ShieldXIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { RowEmptyTrashDialog } from './-empty-trash-dialog';
import { ImportCsvDialog } from './-import-csv-dialog';
import { TableConfigurationDropdown } from './-table-configuration';

import { ChatSidebar } from '@/components/common/chat/chat-sidebar';
import { ChatTrigger } from '@/components/common/chat/chat-trigger';
import { TableStyleViewDropdown } from '@/components/common/dynamic-table/table-selectors/table-style-view';
import { ExportCsvButton } from '@/components/common/export-csv-button';
import { ExtensionSlot } from '@/components/common/extension-slot';
import { getActiveFiltersCount } from '@/components/common/filters/filter-fields';
import { FilterSidebar } from '@/components/common/filters/filter-sidebar';
import { FilterTrigger } from '@/components/common/filters/filter-trigger';
import { LoginButton } from '@/components/common/layout/login-button';
import { PageShell } from '@/components/common/page-shell';
import { Pagination } from '@/components/common/pagination';
import { LoadError } from '@/components/common/route-status/load-error';
import {
  TableCalendarViewSkeleton,
  TableCardViewSkeleton,
  TableDocumentViewSkeleton,
  TableForumViewSkeleton,
  TableGanttViewSkeleton,
  TableGridViewSkeleton,
  TableKanbanViewSkeleton,
  TableListViewSkeleton,
  TableMosaicViewSkeleton,
  TableSkeleton,
} from '@/components/common/table-views';
import { RowBulkActionsBar } from '@/components/common/table-views/row-bulk-actions-bar';
import { RowSelectionProvider } from '@/components/common/table-views/use-row-selection';
import { TrashButton } from '@/components/common/trash-button';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useSidebar } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useReadTableRowPaginated } from '@/hooks/tanstack-query/use-table-row-read-paginated';
import { useTableRowsExportCsv } from '@/hooks/tanstack-query/use-table-rows-export-csv';
import { useChatSidebar } from '@/hooks/use-chat-sidebar';
import { useFilterSidebar } from '@/hooks/use-filter-sidebar';
import { useTablePermission } from '@/hooks/use-table-permission';
import { E_ROLE, E_TABLE_STYLE, MetaDefault } from '@/lib/constant';
import { handleApiError } from '@/lib/handle-api-error';
import { useAuthStore } from '@/stores/authentication';

const rootApi = getRouteApi('__root__');

export const Route = createLazyFileRoute('/_private/tables/$slug/')({
  component: RouteComponent,
});

const VIEW_MAP: Record<
  string,
  {
    skeleton: React.ComponentType;
    view: React.LazyExoticComponent<React.ComponentType<any>>;
    extraProps?: boolean;
  }
> = {
  [E_TABLE_STYLE.LIST]: {
    skeleton: TableListViewSkeleton,
    view: React.lazy(() =>
      import('@/components/common/table-views/table-list-view').then((m) => ({
        default: m.TableListView,
      })),
    ),
  },
  [E_TABLE_STYLE.GALLERY]: {
    skeleton: TableGridViewSkeleton,
    view: React.lazy(() =>
      import('@/components/common/table-views/table-grid-view').then((m) => ({
        default: m.TableGridView,
      })),
    ),
  },
  [E_TABLE_STYLE.DOCUMENT]: {
    skeleton: TableDocumentViewSkeleton,
    view: React.lazy(() =>
      import('@/components/common/table-views/table-document-view').then(
        (m) => ({ default: m.TableDocumentView }),
      ),
    ),
    extraProps: true,
  },
  [E_TABLE_STYLE.CARD]: {
    skeleton: TableCardViewSkeleton,
    view: React.lazy(() =>
      import('@/components/common/table-views/table-card-view').then((m) => ({
        default: m.TableCardView,
      })),
    ),
  },
  [E_TABLE_STYLE.MOSAIC]: {
    skeleton: TableMosaicViewSkeleton,
    view: React.lazy(() =>
      import('@/components/common/table-views/table-mosaic-view').then((m) => ({
        default: m.TableMosaicView,
      })),
    ),
  },
  [E_TABLE_STYLE.KANBAN]: {
    skeleton: TableKanbanViewSkeleton,
    view: React.lazy(() =>
      import('@/components/common/table-views/table-kanban-view').then((m) => ({
        default: m.TableKanbanView,
      })),
    ),
    extraProps: true,
  },
  [E_TABLE_STYLE.FORUM]: {
    skeleton: TableForumViewSkeleton,
    view: React.lazy(() =>
      import('@/components/common/table-views/table-forum-view').then((m) => ({
        default: m.TableForumView,
      })),
    ),
    extraProps: true,
  },
  [E_TABLE_STYLE.CALENDAR]: {
    skeleton: TableCalendarViewSkeleton,
    view: React.lazy(() =>
      import('@/components/common/table-views/table-calendar-view').then(
        (m) => ({ default: m.TableCalendarView }),
      ),
    ),
    extraProps: true,
  },
  [E_TABLE_STYLE.GANTT]: {
    skeleton: TableGanttViewSkeleton,
    view: React.lazy(() =>
      import('@/components/common/table-views/table-gantt-view').then((m) => ({
        default: m.TableGanttView,
      })),
    ),
    extraProps: true,
  },
};

function RouteComponent(): React.JSX.Element {
  const { aiAssistantEnabled } = rootApi.useLoaderData();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = Boolean(user);

  const { slug } = useParams({
    from: '/_private/tables/$slug/',
  });

  const search = useSearch({
    from: '/_private/tables/$slug/',
  });
  const table = useReadTable({ slug });
  const tableStyle = table.data?.style;
  const isKanban = tableStyle === E_TABLE_STYLE.KANBAN;
  const shouldDisablePagination =
    isKanban ||
    tableStyle === E_TABLE_STYLE.DOCUMENT ||
    tableStyle === E_TABLE_STYLE.FORUM ||
    tableStyle === E_TABLE_STYLE.CALENDAR ||
    tableStyle === E_TABLE_STYLE.GANTT;
  const rowsSearch = React.useMemo(() => {
    const base = shouldDisablePagination
      ? {
          ...search,
          page: 1,
          // Kanban agrupa TODOS os registros em colunas, então busca tudo
          // (perPage: -1 → backend sem limite). Um teto fixo (100) truncava
          // colunas quando a tabela tinha muitos registros. As demais views
          // sem paginação mantêm o teto de 100.
          perPage: isKanban ? -1 : 100,
        }
      : search;

    return {
      ...base,
      // Force refetch when switching view styles (forum requires populated data).
      viewStyle: tableStyle ?? E_TABLE_STYLE.LIST,
    };
  }, [search, shouldDisablePagination, isKanban, tableStyle]);
  const rows = useReadTableRowPaginated({ slug, search: rowsSearch });
  const permission = useTablePermission(table.data);

  // Zera a selecao em lote ao trocar de tabela, pagina, view ou lixeira.
  const selectionResetKey = `${slug}:${search.page}:${search.perPage}:${search.trashed ?? false}:${tableStyle ?? ''}`;

  const auth = useAuthStore();
  const canExportCsv =
    auth.user?.group?.slug === E_ROLE.MASTER ||
    auth.user?.group?.slug === E_ROLE.ADMINISTRATOR;
  const exportCsv = useTableRowsExportCsv({
    onError(error) {
      handleApiError(error, { context: 'Erro ao exportar CSV' });
    },
  });

  const router = useRouter();
  const sidebar = useSidebar();

  const { open: filterOpen, onOpenChange: handleFilterOpenChange } =
    useFilterSidebar();

  const filterFields = React.useMemo(() => {
    const filtered = (table.data?.fields ?? []).filter((f) => f.showInFilter);
    const order = table.data?.fieldOrderFilter ?? [];
    if (order.length === 0) return filtered;
    return [...filtered].sort((a, b) => {
      const idxA = order.indexOf(a._id);
      const idxB = order.indexOf(b._id);
      return (idxA === -1 ? Infinity : idxA) - (idxB === -1 ? Infinity : idxB);
    });
  }, [table.data?.fields, table.data?.fieldOrderFilter]);
  const activeFiltersCount = getActiveFiltersCount(filterFields, search);

  const { open: chatOpen, onOpenChange: handleChatOpenChange } =
    useChatSidebar();

  return (
    <RowSelectionProvider resetKey={selectionResetKey}>
      <PageShell data-test-id="table-detail-page">
        <PageShell.Header>
          <div className="inline-flex items-center space-x-2">
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  sidebar.setOpen(true);
                  router.navigate({
                    to: '/tables',
                    replace: true,
                  });
                }}
              >
                <ArrowLeftIcon />
              </Button>
            )}

            {table.status === 'pending' && <Skeleton className="h-8 w-40" />}

            {table.status === 'success' && (
              <h1 className="text-2xl font-medium">{table.data.name}</h1>
            )}

            <Button
              variant="outline"
              className="shadow-none p-1 h-auto"
              // size="icon-sm"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.info('Link da tabela copiado', {
                  description:
                    'O link da tabela foi copiado para a área de transferência',
                });
              }}
            >
              <Share2Icon />
              <span className="sr-only">Compartilhar</span>
            </Button>
          </div>

          <div className="inline-flex items-center space-x-2">
            {table.status === 'success' && filterFields.length > 0 && (
              <FilterTrigger
                activeFiltersCount={activeFiltersCount}
                onClick={() => handleFilterOpenChange(!filterOpen)}
                isOpen={filterOpen}
              />
            )}
            {permission.can('REMOVE_ROW') && search.trashed && (
              <RowEmptyTrashDialog slug={slug} />
            )}
            {permission.can('UPDATE_ROW') && <TrashButton />}

            <TableStyleViewDropdown slug={slug} />
            {canExportCsv && (
              <ExportCsvButton
                testId="export-table-rows-csv-btn"
                isPending={exportCsv.isPending}
                onClick={() =>
                  exportCsv.mutate({
                    slug,
                    ...(search as Record<string, unknown>),
                  })
                }
              />
            )}
            {canExportCsv && <ImportCsvDialog slug={slug} />}
            <TableConfigurationDropdown tableSlug={slug} />
            {aiAssistantEnabled && (
              <ChatTrigger
                onClick={() => handleChatOpenChange(!chatOpen)}
                isOpen={chatOpen}
              />
            )}

            <ExtensionSlot
              id="table.actions"
              context={{ table: table.data, slug }}
            />

            {permission.can('CREATE_ROW') &&
              (table.data?.fields?.filter((f) => !f.native)?.length ?? 0) >
                0 && (
                <Button
                  disabled={
                    rows.status === 'pending' || rows.status === 'error'
                  }
                  className="disabled:cursor-not-allowed shadow-none p-1 h-auto"
                  onClick={() => {
                    sidebar.setOpen(false);
                    router.navigate({
                      to: '/tables/$slug/row/create',
                      replace: true,
                      params: { slug },
                    });
                  }}
                >
                  <PlusIcon />
                  <span>Registro</span>
                </Button>
              )}
          </div>
        </PageShell.Header>

        <div className="flex-1 flex flex-row min-h-0">
          {table.status === 'success' && filterFields.length > 0 && (
            <FilterSidebar
              fields={filterFields}
              open={filterOpen}
              onOpenChange={handleFilterOpenChange}
              table={table.data}
            />
          )}
          <PageShell.Content>
            {table.status === 'pending' && <TableSkeleton />}
            {table.status === 'success' &&
              rows.status === 'pending' &&
              ((): React.JSX.Element | null => {
                const entry = VIEW_MAP[table.data.style];
                if (!entry) return null;
                const SkeletonComponent = entry.skeleton;
                return <SkeletonComponent />;
              })()}

            {rows.status === 'error' &&
              ((): React.JSX.Element => {
                const error = rows.error as AxiosError<{
                  code: number;
                  cause: string;
                }>;
                const cause = error.response?.data.cause;

                // Erros de permissão - sem botão de refetch
                if (
                  cause === 'TABLE_PRIVATE' ||
                  cause === 'FORM_VIEW_RESTRICTED' ||
                  error.response?.status === 403 ||
                  error.response?.status === 401
                ) {
                  const message =
                    cause === 'TABLE_PRIVATE'
                      ? 'Esta tabela é privada'
                      : cause === 'FORM_VIEW_RESTRICTED'
                        ? 'Apenas o dono pode visualizar tabelas de formulário'
                        : 'Você não tem permissão para acessar esta tabela';

                  return (
                    <Empty className="from-muted/50 to-background h-full bg-linear-to-b from-30%">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <ShieldXIcon />
                        </EmptyMedia>
                        <EmptyTitle>Acesso negado</EmptyTitle>
                        <EmptyDescription>{message}</EmptyDescription>
                        {!isAuthenticated && (
                          <div className="mt-4">
                            <LoginButton />
                          </div>
                        )}
                      </EmptyHeader>
                    </Empty>
                  );
                }

                // Outros erros - com botão de refetch
                return (
                  <LoadError
                    message="Houve um erro ao buscar dados de registros da tabela"
                    refetch={rows.refetch}
                  />
                );
              })()}

            {table.status === 'success' &&
              rows.status === 'success' &&
              ((): React.JSX.Element | null => {
                const entry = VIEW_MAP[table.data.style];
                if (!entry) return null;
                const ViewComponent = entry.view;
                const SkeletonComponent = entry.skeleton;
                const baseProps = {
                  headers: table.data.fields,
                  order: table.data.fieldOrderList ?? [],
                  data: rows.data.data,
                  layoutFields: table.data.layoutFields,
                };
                return (
                  <React.Suspense fallback={<SkeletonComponent />}>
                    {entry.extraProps ? (
                      <ViewComponent
                        {...baseProps}
                        tableSlug={slug}
                        table={table.data}
                      />
                    ) : (
                      <ViewComponent {...baseProps} />
                    )}
                  </React.Suspense>
                );
              })()}

            <RowBulkActionsBar
              slug={slug}
              table={table.data}
              isTrashView={search.trashed === true}
            />
          </PageShell.Content>
          {aiAssistantEnabled && (
            <ChatSidebar
              open={chatOpen}
              onOpenChange={handleChatOpenChange}
            />
          )}
        </div>

        {!shouldDisablePagination && (
          <PageShell.Footer>
            <Pagination
              meta={rows.data?.meta ?? MetaDefault}
              page={search.page}
              perPage={search.perPage}
              onPageChange={(newPage) => {
                void router.navigate({
                  to: '.',
                  search: (prev) => ({ ...prev, page: String(newPage) }),
                });
              }}
              onPerPageChange={(newPerPage) => {
                void router.navigate({
                  to: '.',
                  search: (prev) => ({
                    ...prev,
                    perPage: String(newPerPage),
                    page: String(1),
                  }),
                });
              }}
            />
          </PageShell.Footer>
        )}
      </PageShell>
    </RowSelectionProvider>
  );
}
