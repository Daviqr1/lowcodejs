import type { UseQueryResult } from '@tanstack/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IExtension } from '@/lib/interfaces';
import { useAuthStore } from '@/stores/authentication';

export type IActiveExtension = Omit<IExtension, 'manifestSnapshot'>;

// Sem return type explícito de propósito: anotar apaga a queryKey estreita (vira
// `readonly unknown[]`) e/ou alarga para `UseQueryOptions`, quebrando o
// `staleTime` e os consumidores `useSuspenseQuery`. O inferido do `queryOptions`
// é o correto. Espelha os factories de `_query-options.ts`.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const extensionActiveListOptions = () =>
  queryOptions({
    queryKey: queryKeys.extensions.active(),
    queryFn: async () => {
      const response =
        await API.get<Array<IActiveExtension>>('/extensions/active');
      return response.data;
    },
    staleTime: 60 * 1000,
  });

type UseExtensionsActiveListOptions = {
  enabled?: boolean;
};

export function useExtensionsActiveList(
  options?: UseExtensionsActiveListOptions,
): UseQueryResult<Array<IActiveExtension>, Error> {
  const authentication = useAuthStore();
  const isAuthenticated = Boolean(authentication.user?._id);

  return useQuery({
    ...extensionActiveListOptions(),
    enabled: options?.enabled ?? isAuthenticated,
  });
}
