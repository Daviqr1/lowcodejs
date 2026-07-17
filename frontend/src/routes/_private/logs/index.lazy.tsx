import {
  createLazyFileRoute,
  useNavigate,
  useSearch,
} from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  ActivityIcon,
  CalendarClockIcon,
  PencilIcon,
  PlusIcon,
  UserIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import type { ActionType } from './-constants';
import { ACTION_OPTIONS, OBJECT_OPTIONS, ROUTE_ID } from './-constants';
import { downloadCsv, entriesToCsv } from './-csv';
import { JsonDialog } from './-json-dialog';
import { StatCard } from './-stat-card';
import { TableHistory } from './-table-history';

import { CsvDropdown } from '@/components/common/csv-dropdown';
import { FilterSidebar, FilterTrigger } from '@/components/common/filters';
import { InputSearch } from '@/components/common/input-search';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { Pagination } from '@/components/common/pagination';
import { Badge } from '@/components/ui/badge';
import { useGroupReadList } from '@/hooks/tanstack-query/use-group-read-list';
import { useLoggerReadPaginated } from '@/hooks/tanstack-query/use-logger-read-paginated';
import { useFilterSidebar } from '@/hooks/use-filter-sidebar';
import {
  E_FIELD_TYPE,
  LOGGER_ACTION_LABEL,
  LOGGER_OBJECT_LABEL,
  MetaDefault,
} from '@/lib/constant';
import type { IFilterField, ILogger } from '@/lib/interfaces';
import { isPrivileged } from '@/lib/permission';
import { useAuthStore } from '@/stores/authentication';

export const Route = createLazyFileRoute('/_private/logs/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const navigate = useNavigate({ from: '/logs/' });
  const search = useSearch({ from: ROUTE_ID });
  const auth = useAuthStore();
  const groups = useGroupReadList();
  const privileged = isPrivileged(auth.user, groups.data ?? []);

  const filterSidebar = useFilterSidebar();
  // alvo do modal de JSON: entrada + nonce (reabre o dialog uncontrolled via ref).
  const [jsonTarget, setJsonTarget] = React.useState<{
    entry: ILogger;
    nonce: number;
  } | null>(null);
  const jsonTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(
    function openJsonDialog() {
      if (jsonTarget) jsonTriggerRef.current?.click();
    },
    [jsonTarget],
  );

  const openJson = React.useCallback((entry: ILogger) => {
    setJsonTarget((previous) => ({ entry, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);
  const [toolbarNode, setToolbarNode] = React.useState<HTMLDivElement | null>(
    null,
  );

  const fieldFilters: Array<IFilterField> = [
    {
      slug: 'actions',
      name: 'Ação',
      type: E_FIELD_TYPE.DROPDOWN,
      multiple: true,
      dropdown: ACTION_OPTIONS.map((action) => ({
        id: action,
        label: LOGGER_ACTION_LABEL[action],
        color: null,
      })),
    },
    {
      slug: 'objects',
      name: 'Tipo de objeto',
      type: E_FIELD_TYPE.DROPDOWN,
      multiple: true,
      dropdown: OBJECT_OPTIONS.map((type) => ({
        id: type,
        label: LOGGER_OBJECT_LABEL[type],
        color: null,
      })),
    },
    {
      slug: 'date-range',
      name: 'Data',
      type: E_FIELD_TYPE.DATE,
      multiple: false,
    },
  ];

  const queryParams = React.useMemo(() => {
    const orderKeys = [
      'order-created-at',
      'order-user',
      'order-action',
      'order-object',
      'order-object-id',
      'order-url',
    ] as const;
    const orderEntries: Record<string, 'asc' | 'desc'> = {};
    for (const key of orderKeys) {
      const value = search[key];
      if (value) orderEntries[key] = value;
    }

    return {
      page: search.page,
      perPage: search.perPage,
      ...(search.search && { search: search.search }),
      ...(search.actions && {
        actions: search.actions,
      }),
      ...(search.objects && {
        objects: search.objects,
      }),
      ...(search['date-range-initial'] && {
        'date-from': new Date(
          `${search['date-range-initial']}T00:00:00`,
        ).toISOString(),
      }),
      ...(search['date-range-final'] && {
        'date-to': new Date(
          `${search['date-range-final']}T23:59:59.999`,
        ).toISOString(),
      }),
      ...orderEntries,
    };
  }, [search]);

  const { data, isLoading } = useLoggerReadPaginated(queryParams);

  const entries = data?.data ?? [];
  const meta = data?.meta ?? MetaDefault;

  const stats = React.useMemo(() => {
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const counts: Record<ActionType, number> = {
      CREATE: 0,
      UPDATE: 0,
      VIEW: 0,
      DELETE: 0,
    };
    let todayCount = 0;
    for (const entry of entries) {
      counts[entry.action] += 1;
      if (entry.createdAt?.startsWith(todayPrefix)) todayCount += 1;
    }
    return { todayCount, counts };
  }, [entries]);

  let activeFilterCount = 0;
  if (search.actions) activeFilterCount += 1;
  if (search.objects) activeFilterCount += 1;
  if (search['date-range-initial'] || search['date-range-final'])
    activeFilterCount += 1;
  if (search.search) activeFilterCount += 1;

  const handleExport = (): void => {
    const csv = entriesToCsv(entries);
    const stamp = format(new Date(), 'yyyy-MM-dd_HHmm');
    downloadCsv(csv, `historico-acoes_${stamp}.csv`);
    let plural = 's';
    if (entries.length === 1) {
      plural = '';
    }
    toast.success('CSV exportado', {
      description: `${entries.length} registro${plural} no arquivo`,
    });
  };

  return (
    <PageShell data-test-id="history-page">
      <PageShell.Header className="flex-col items-stretch gap-3">
        <div className="flex items-center justify-between gap-2">
          <PageHeader title="Histórico de ações">
            <Badge
              variant="outline"
              data-test-id="history-count-badge"
            >
              {entries.length} de {meta.total}
            </Badge>
          </PageHeader>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end lg:gap-3">
          <div className="lg:w-96">
            <InputSearch />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div ref={setToolbarNode} />
            <FilterTrigger
              activeFiltersCount={activeFilterCount}
              onClick={() => filterSidebar.onOpenChange(!filterSidebar.open)}
              isOpen={filterSidebar.open}
            />
            <CsvDropdown
              testId="history-csv"
              disabled={entries.length === 0}
              onExport={handleExport}
            />
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <StatCard
            label="Total"
            value={meta.total}
            icon={ActivityIcon}
          />
          <StatCard
            label="Hoje (página)"
            value={stats.todayCount}
            icon={CalendarClockIcon}
            accentClass="bg-sky-500/15 text-sky-700 dark:text-sky-300"
          />
          <StatCard
            label="Edições (página)"
            value={stats.counts.UPDATE}
            icon={PencilIcon}
            accentClass="bg-amber-500/15 text-amber-700 dark:text-amber-300"
          />
          <StatCard
            label="Adições (página)"
            value={stats.counts.CREATE}
            icon={PlusIcon}
            accentClass="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          />
        </div>

        {!privileged && (
          <div className="text-xs text-muted-foreground">
            <UserIcon className="inline size-3 mr-1" />
            Você está visualizando apenas as suas próprias ações.
          </div>
        )}
      </PageShell.Header>

      <div className="flex-1 flex flex-row min-h-0">
        <FilterSidebar
          fields={fieldFilters}
          open={filterSidebar.open}
          onOpenChange={filterSidebar.onOpenChange}
        />
        <PageShell.Content>
          <TableHistory
            data={entries}
            toolbarPortal={toolbarNode}
            onOpenJson={openJson}
            isLoading={isLoading}
          />
        </PageShell.Content>
      </div>

      <PageShell.Footer>
        <Pagination
          meta={meta}
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

      {jsonTarget && (
        <JsonDialog
          key={jsonTarget.nonce}
          ref={jsonTriggerRef}
          entry={jsonTarget.entry}
        />
      )}
    </PageShell>
  );
}
