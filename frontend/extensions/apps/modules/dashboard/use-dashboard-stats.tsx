import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { API } from '@/lib/api';

export type DashboardStats = {
  totals: {
    tables: number;
    users: number;
    records: number;
    activeUsers: number;
  };
  tablesPerMonth: Array<{ month: string; tables: number }>;
  usersByStatus: Array<{ status: string; value: number; fill: string }>;
  recentActivity: Array<{
    id: string;
    type: 'table_created' | 'user_created';
    description: string;
    time: string;
  }>;
};

export function useDashboardStats(): UseQueryResult<DashboardStats, Error> {
  return useQuery({
    queryKey: ['extensions', 'apps', 'dashboard', 'stats'],
    queryFn: async () => {
      const response = await API.get<DashboardStats>('/e/apps/dashboard/stats');
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}
