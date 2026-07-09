import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createLazyFileRoute,
  useNavigate,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import { Trash2Icon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { TableUsers } from './-table-users';

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
import { userListOptions } from '@/hooks/tanstack-query/_query-options';
import { useGroupReadList } from '@/hooks/tanstack-query/use-group-read-list';
import { useUserEmptyTrash } from '@/hooks/tanstack-query/use-user-empty-trash';
import { useUsersExportCsv } from '@/hooks/tanstack-query/use-users-export-csv';
import { E_FIELD_TYPE, E_ROLE } from '@/lib/constant';
import { handleApiError } from '@/lib/handle-api-error';
import type { IFilterField } from '@/lib/interfaces';
import { isMaster, isPrivileged } from '@/lib/permission';
import { useAuthStore } from '@/stores/authentication';

export const Route = createLazyFileRoute('/_private/users/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const [toolbarNode, setToolbarNode] = React.useState<HTMLDivElement | null>(
    null,
  );
  const auth = useAuthStore();

  const search = useSearch({
    from: '/_private/users/',
  });

  const router = useRouter();
  const navigate = useNavigate({ from: '/users/' });

  const sidebar = useSidebar();

  const { data } = useSuspenseQuery(
    userListOptions({
      ...search,
      authenticated: auth.user?._id,
      role: E_ROLE.ADMINISTRATOR,
    }),
  );

  // Empty-trash/hard-delete é MASTER-only (gate intencional). Export/CSV libera
  // para qualquer privilegiado (MASTER/ADMINISTRATOR pelo fecho de grupos).
  // Ambos resolvidos pelo fecho de grupos (não apenas o grupo principal).
  const groups = useGroupReadList();
  const master = isMaster(auth.user, groups.data ?? []);
  const canExportCsv = isPrivileged(auth.user, groups.data ?? []);
  const isTrashView = search.trashed === true;

  const exportCsv = useUsersExportCsv({
    onError(error) {
      handleApiError(error, { context: 'Erro ao exportar CSV' });
    },
  });

  const emptyTrash = useUserEmptyTrash({
    onSuccess(result) {
      let message = result.deleted
        .toString()
        .concat(' usuários excluídos permanentemente!');
      if (result.deleted === 1) message = '1 usuário excluído permanentemente!';
      toast.success(message, {
        description: 'A lixeira de usuários foi esvaziada',
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao esvaziar lixeira de usuários',
      });
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
    <PageShell data-test-id="users-page">
      <PageShell.Header>
        <div className="space-y-1">
          <h1 className="text-2xl font-medium">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os usuários do sistema
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
              testId="export-users-csv-btn"
              isPending={exportCsv.isPending}
              onClick={() => exportCsv.mutate(search)}
            />
          )}
          {isTrashView && master && (
            <PermanentDeleteConfirmDialog
              asChild
              title="Esvaziar lixeira de usuários"
              description="Essa ação é irreversível. Todos os usuários na lixeira serão excluídos permanentemente."
              itemsCount={data.meta.total}
              isPending={emptyTrash.isPending}
              onConfirm={(close) => {
                emptyTrash.mutateAsync(undefined, { onSuccess: close });
              }}
              testId="empty-trash-users-dialog"
            >
              <Button
                data-test-id="empty-trash-users-btn"
                variant="destructive"
              >
                <Trash2Icon className="size-4" />
                <span>Esvaziar lixeira</span>
              </Button>
            </PermanentDeleteConfirmDialog>
          )}
          {!isTrashView && (
            <Button
              data-test-id="create-user-btn"
              onClick={() => {
                sidebar.setOpen(false);
                router.navigate({
                  to: '/users/create',
                  replace: true,
                });
              }}
              className="disabled:cursor-not-allowed"
            >
              <span>Novo Usuário</span>
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
          <TableUsers
            data={data.data}
            toolbarPortal={toolbarNode}
          />
        </PageShell.Content>
      </div>

      <PageShell.Footer>
        <Pagination
          meta={data.meta}
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
    </PageShell>
  );
}
