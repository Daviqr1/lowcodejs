import {
  createLazyFileRoute,
  useNavigate,
  useSearch,
} from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  CalendarClockIcon,
  CheckCheckIcon,
  CircleAlertIcon,
  InboxIcon,
  ServerCrashIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { ROUTE_ID, STATUS_OPTIONS } from './-constants';
import { downloadCsv, entriesToCsv } from './-csv';
import { JsonDialog } from './-json-dialog';
import { StatCard } from './-stat-card';
import { TableErrors } from './-table-errors';

import { CsvDropdown } from '@/components/common/csv-dropdown';
import { FilterSidebar, FilterTrigger } from '@/components/common/filters';
import { InputSearch } from '@/components/common/input-search';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { Pagination } from '@/components/common/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { IErrorLog } from '@/hooks/tanstack-query/use-error-log-read-paginated';
import { useErrorLogReadPaginated } from '@/hooks/tanstack-query/use-error-log-read-paginated';
import { useFilterSidebar } from '@/hooks/use-filter-sidebar';
import { E_FIELD_TYPE, MetaDefault } from '@/lib/constant';
import type { IFilterField } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

export const Route = createLazyFileRoute('/_private/error-logs/')({
  component: RouteComponent,
});

function RouteComponent(): React.JSX.Element {
  const navigate = useNavigate({ from: '/error-logs/' });
  const search = useSearch({ from: ROUTE_ID });

  const filterSidebar = useFilterSidebar();
  const isResolvedView = search.resolved === 'true';
  const [jsonEntry, setJsonEntry] = React.useState<IErrorLog | null>(null);
  const [toolbarNode, setToolbarNode] = React.useState<HTMLDivElement | null>(
    null,
  );

  const fieldFilters: Array<IFilterField> = [
    {
      slug: 'statuses',
      name: 'Status',
      type: E_FIELD_TYPE.DROPDOWN,
      multiple: true,
      dropdown: STATUS_OPTIONS.map((status) => ({
        id: status.id,
        label: status.label,
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
      'order-status',
      'order-method',
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
      ...(search.statuses && { statuses: search.statuses }),
      ...(search.resolved && { resolved: search.resolved }),
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

  const { data, isLoading } = useErrorLogReadPaginated(queryParams);

  const entries = data?.data ?? [];
  const meta = data?.meta ?? MetaDefault;

  const stats = React.useMemo(() => {
    const todayPrefix = new Date().toISOString().slice(0, 10);
    let todayCount = 0;
    let serverCount = 0;
    let clientCount = 0;
    for (const entry of entries) {
      if (entry.createdAt?.startsWith(todayPrefix)) todayCount += 1;
      if (entry.statusCode >= 500) {
        serverCount += 1;
      } else {
        clientCount += 1;
      }
    }
    return { todayCount, serverCount, clientCount };
  }, [entries]);

  let activeFilterCount = 0;
  if (search.statuses) activeFilterCount += 1;
  if (search['date-range-initial'] || search['date-range-final'])
    activeFilterCount += 1;
  if (search.search) activeFilterCount += 1;

  const handleExport = (): void => {
    const csv = entriesToCsv(entries);
    const stamp = format(new Date(), 'yyyy-MM-dd_HHmm');
    downloadCsv(csv, `historico-erros_${stamp}.csv`);
    let plural = 's';
    if (entries.length === 1) {
      plural = '';
    }
    toast.success('CSV exportado', {
      description: `${entries.length} registro${plural} no arquivo`,
    });
  };

  const viewResolved = (show: boolean): void => {
    if (show) {
      navigate({ search: (prev) => ({ ...prev, resolved: 'true', page: 1 }) });
      return;
    }
    navigate({ search: (prev) => ({ ...prev, resolved: undefined, page: 1 }) });
  };

  return (
    <PageShell data-test-id="error-logs-page">
      <PageShell.Header className="flex-col items-stretch gap-3">
        <div className="flex items-center justify-between gap-2">
          <PageHeader title="Histórico de erros">
            <Badge
              variant="outline"
              data-test-id="error-logs-count-badge"
            >
              {entries.length} de {meta.total}
            </Badge>
          </PageHeader>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end lg:gap-3">
          <div className="lg:w-96">
            <InputSearch />
          </div>

          <div className="inline-flex items-center gap-2">
            <div ref={setToolbarNode} />
            <Button
              data-test-id="error-logs-resolved-toggle"
              variant="outline"
              size="sm"
              onClick={() => viewResolved(!isResolvedView)}
              className={cn(
                'inline-flex gap-1',
                isResolvedView && 'border-muted-foreground',
              )}
            >
              {!isResolvedView && (
                <React.Fragment>
                  <CheckCheckIcon className="size-4" />
                  <span>Ver resolvidos</span>
                </React.Fragment>
              )}
              {isResolvedView && (
                <React.Fragment>
                  <InboxIcon className="size-4" />
                  <span>Em aberto</span>
                </React.Fragment>
              )}
            </Button>
            <FilterTrigger
              activeFiltersCount={activeFilterCount}
              onClick={() => filterSidebar.onOpenChange(!filterSidebar.open)}
              isOpen={filterSidebar.open}
            />
            <CsvDropdown
              testId="error-logs-csv"
              disabled={entries.length === 0}
              onExport={handleExport}
            />
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <StatCard
            label="Total"
            value={meta.total}
            icon={TriangleAlertIcon}
          />
          <StatCard
            label="Hoje (página)"
            value={stats.todayCount}
            icon={CalendarClockIcon}
            accentClass="bg-sky-500/15 text-sky-700 dark:text-sky-300"
          />
          <StatCard
            label="Servidor (página)"
            value={stats.serverCount}
            icon={ServerCrashIcon}
            accentClass="bg-red-500/15 text-red-700 dark:text-red-300"
          />
          <StatCard
            label="Cliente (página)"
            value={stats.clientCount}
            icon={CircleAlertIcon}
            accentClass="bg-amber-500/15 text-amber-700 dark:text-amber-300"
          />
        </div>
      </PageShell.Header>

      <div className="flex-1 flex flex-row min-h-0">
        <FilterSidebar
          fields={fieldFilters}
          open={filterSidebar.open}
          onOpenChange={filterSidebar.onOpenChange}
        />
        <PageShell.Content>
          <TableErrors
            data={entries}
            toolbarPortal={toolbarNode}
            onOpenJson={setJsonEntry}
            isLoading={isLoading}
            isResolvedView={isResolvedView}
            onViewResolved={viewResolved}
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

      <JsonDialog
        entry={jsonEntry}
        onClose={() => setJsonEntry(null)}
      />
    </PageShell>
  );
}
