import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from './_query-keys';
import { tableDetailOptions } from './_query-options';

import { API } from '@/lib/api';
import type { ITable } from '@/lib/interfaces';

export function useReadTable(payload: {
  slug: string;
}): UseQueryResult<ITable, Error> {
  return useQuery(tableDetailOptions(payload.slug));
}

type PaginatedTablesResponse = {
  data: Array<ITable>;
  meta: {
    page: number;
    perPage: number;
    total: number;
  };
};

export function useReadTables(payload?: {
  page?: number;
  perPage?: number;
}): UseQueryResult<Array<ITable>, Error> {
  const page = payload?.page ?? 1;
  const perPage = payload?.perPage ?? 50;

  return useQuery({
    queryKey: queryKeys.tables.list({ page, perPage }),
    queryFn: async () => {
      const response = await API.get<PaginatedTablesResponse>(
        '/tables/paginated',
        {
          params: { page, perPage },
        },
      );
      return response.data.data;
    },
    staleTime: 60 * 1000,
  });
}
