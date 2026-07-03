import { FileText, Table, UserCheck, Users } from 'lucide-react';
import React from 'react';

import { ChartTables } from './chart-tables';
import { ChartUsers } from './chart-users';
import { DashboardContentSkeleton } from './dashboard-skeleton';
import { RecentActivity } from './recent-activity';
import { StatCard } from './stat-card';
import { useDashboardStats } from './use-dashboard-stats';

import { PageHeader, PageShell } from '@/components/common/page-shell';
import { LoadError } from '@/components/common/route-status/load-error';

export default function DashboardModule(): React.JSX.Element {
  const stats = useDashboardStats();

  let activeUsersDescription: string | undefined;
  if (stats.status === 'success' && stats.data.totals.users > 0) {
    const percent = Math.round(
      (stats.data.totals.activeUsers / stats.data.totals.users) * 100,
    );
    activeUsersDescription = `${percent}% do total`;
  }

  return (
    <PageShell data-test-id="module-dashboard">
      <PageShell.Header>
        <PageHeader title="Dashboard" />
      </PageShell.Header>

      <PageShell.Content className="p-4">
        {stats.status === 'pending' && <DashboardContentSkeleton />}

        {stats.status === 'error' && (
          <LoadError
            message={stats.error.message}
            refetch={() => stats.refetch()}
          />
        )}

        {stats.status === 'success' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total de Tabelas"
                value={stats.data.totals.tables}
                icon={Table}
              />
              <StatCard
                title="Total de Usuários"
                value={stats.data.totals.users}
                icon={Users}
              />
              <StatCard
                title="Total de Registros"
                value={stats.data.totals.records}
                icon={FileText}
              />
              <StatCard
                title="Usuários Ativos"
                value={stats.data.totals.activeUsers}
                icon={UserCheck}
                description={activeUsersDescription}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartTables data={stats.data.tablesPerMonth} />
              <ChartUsers data={stats.data.usersByStatus} />
            </div>

            <RecentActivity data={stats.data.recentActivity} />
          </div>
        )}
      </PageShell.Content>
    </PageShell>
  );
}
