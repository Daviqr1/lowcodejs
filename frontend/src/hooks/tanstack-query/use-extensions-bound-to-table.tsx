import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IExtension } from '@/lib/interfaces';

export function useExtensionsBoundToTable(
  tableId: string | undefined,
  options?: Omit<
    UseQueryOptions<IExtension[], AxiosError | Error>,
    'queryKey' | 'queryFn' | 'enabled'
  > & { enabled?: boolean },
) {
  return useQuery<IExtension[], AxiosError | Error>({
    queryKey: queryKeys.extensions.boundTo(tableId ?? ''),
    queryFn: async () => {
      const all = await API.get<IExtension[]>('/extensions').then(
        (r) => r.data,
      );
      return all.filter(
        (e) =>
          e.enabled &&
          e.available &&
          e.type === 'PLUGIN' &&
          (e.tableScope?.mode === 'all' ||
            e.tableScope?.tableIds?.includes(tableId ?? '')),
      );
    },
    enabled: Boolean(tableId) && options?.enabled !== false,
    staleTime: 60_000,
    ...options,
  });
}
