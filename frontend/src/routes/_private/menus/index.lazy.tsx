import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createLazyFileRoute,
  useNavigate,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import { ListTreeIcon, Trash2Icon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { MenuReorderDialog } from './-reorder-dialog';
import { TableMenus } from './-table-menus';

import { ExportCsvButton } from '@/components/common/export-csv-button';
import { getActiveFiltersCount } from '@/components/common/filters/filter-fields';
import { FilterSidebar } from '@/components/common/filters/filter-sidebar';
import { FilterTrigger } from '@/components/common/filters/filter-trigger';
import { PageShell } from '@/components/common/page-shell';
import { Pagination } from '@/components/common/pagination';
import { PermanentDeleteConfirmDialog } from '@/components/common/permanent-delete-confirm-dialog';
import { TrashButton } from '@/components/common/trash-button';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { menuListOptions } from '@/hooks/tanstack-query/_query-options';
import { useGroupReadList } from '@/hooks/tanstack-query/use-group-read-list';
import { useMenuEmptyTrash } from '@/hooks/tanstack-query/use-menu-empty-trash';
import { useMenusExportCsv } from '@/hooks/tanstack-query/use-menus-export-csv';
import { E_FIELD_TYPE, MetaDefault } from '@/lib/constant';
import { handleApiError } from '@/lib/handle-api-error';
import type { IFilterField } from '@/lib/interfaces';
import { isMaster, isPrivileged } from '@/lib/permission';
import { useAuthStore } from '@/stores/authentication';

export const Route = createLazyFileRoute('/_private/menus/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const [toolbarNode, setToolbarNode] = React.useState<HTMLDivElement | null>(
    null,
  );
  const search = useSearch({ from: '/_private/menus/' });
  const sidebar = useSidebar();
  const router = useRouter();
  const navigate = useNavigate({ from: '/menus/' });
  const auth = useAuthStore();

  const { data } = useSuspenseQuery(menuListOptions(search));

  // Empty-trash/hard-delete é MASTER-only (gate intencional). Export/CSV libera
  // para qualquer privilegiado (MASTER/ADMINISTRATOR pelo fecho de grupos).
  const groups = useGroupReadList();
  const master = isMaster(auth.user, groups.data ?? []);
  const canExportCsv = isPrivileged(auth.user, groups.data ?? []);
  const isTrashView = search.trashed === true;

  const [reorderOpen, setReorderOpen] = React.useState(false);

  const exportCsv = useMenusExportCsv({
    onError(error) {
      handleApiError(error, { context: 'Erro ao exportar CSV' });
    },
  });

  const emptyTrash = useMenuEmptyTrash({
    onSuccess(result) {
      let message = result.deleted
        .toString()
        .concat(' menus excluídos permanentemente!');
      if (result.deleted === 1) message = '1 menu excluído permanentemente!';
      toast.success(message, {
        description: 'A lixeira de menus foi esvaziada',
      });
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao esvaziar lixeira de menus' });
    },
  });

  const [filterOpen, setFilterOpen] = React.useState(() => {
    try {
      return localStorage.getItem('filter-sidebar-open') === 'true';
    } catch {
      return false;
    }
  });

  const handleFilterOpenChange = React.useCallback((open: boolean) => {
    setFilterOpen(open);
    try {
      localStorage.setItem('filter-sidebar-open', String(open));
    } catch {}
  }, []);

  const fieldFilters: Array<IFilterField> = [
    {
      slug: 'search',
      name: 'Nome',
      type: E_FIELD_TYPE.TEXT_SHORT,
      multiple: false,
    },
  ];

  const activeFiltersCount = getActiveFiltersCount(fieldFilters, search);

  return (
    <PageShell data-test-id="menus-page">
      <PageShell.Header>
        <div className="space-y-1">
          <h1 className="text-2xl font-medium">Gestão de Menus</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os itens de menu e navegação
          </p>
        </div>
        <div className="inline-flex items-center gap-2">
          <div ref={setToolbarNode} />
          <TrashButton />
          <FilterTrigger
            activeFiltersCount={activeFiltersCount}
            onClick={() => handleFilterOpenChange(!filterOpen)}
            isOpen={filterOpen}
          />
          {canExportCsv && (
            <ExportCsvButton
              testId="export-menus-csv-btn"
              isPending={exportCsv.isPending}
              onClick={() => exportCsv.mutate(search)}
            />
          )}
          {isTrashView && master && (
            <PermanentDeleteConfirmDialog
              asChild
              title="Esvaziar lixeira de menus"
              description="Essa ação é irreversível. Todos os menus na lixeira serão excluídos permanentemente."
              itemsCount={data.meta?.total ?? 0}
              isPending={emptyTrash.isPending}
              onConfirm={(close) => {
                void emptyTrash
                  .mutateAsync()
                  .then(close)
                  .catch(() => {});
              }}
              testId="empty-trash-menus-dialog"
            >
              <Button
                data-test-id="empty-trash-menus-btn"
                variant="destructive"
              >
                <Trash2Icon className="size-4" />
                <span>Esvaziar lixeira</span>
              </Button>
            </PermanentDeleteConfirmDialog>
          )}
          {!isTrashView && (
            <Button
              data-test-id="reorder-menus-btn"
              type="button"
              variant="outline"
              onClick={() => setReorderOpen(true)}
            >
              <ListTreeIcon className="size-4" />
              <span>Ordenar</span>
            </Button>
          )}
          {!isTrashView && (
            <Button
              data-test-id="create-menu-btn"
              className="disabled:cursor-not-allowed"
              onClick={() => {
                sidebar.setOpen(false);
                router.navigate({
                  to: '/menus/create',
                  replace: true,
                });
              }}
            >
              <span>Novo Menu</span>
            </Button>
          )}
        </div>
      </PageShell.Header>

      <div className="flex-1 flex flex-row min-h-0">
        <FilterSidebar
          fields={fieldFilters}
          open={filterOpen}
          onOpenChange={handleFilterOpenChange}
        />
        <PageShell.Content>
          <TableMenus
            data={data.data}
            toolbarPortal={toolbarNode}
          />
        </PageShell.Content>
      </div>

      <PageShell.Footer>
        <Pagination
          meta={data.meta ?? MetaDefault}
          page={search.page}
          perPage={search.perPage}
          onPageChange={(page) =>
            navigate({ search: (prev) => ({ ...prev, page }) })
          }
          onPerPageChange={(perPage) =>
            navigate({ search: (prev) => ({ ...prev, perPage, page: 1 }) })
          }
        />
      </PageShell.Footer>

      <MenuReorderDialog
        open={reorderOpen}
        onOpenChange={setReorderOpen}
      />
    </PageShell>
  );
}
