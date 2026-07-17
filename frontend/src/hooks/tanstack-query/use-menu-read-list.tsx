import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { menuAllOptions } from './_query-options';

import type { IMenu } from '@/lib/interfaces';
import { useAuthStore } from '@/stores/authentication';

type UseMenuReadListOptions = {
  enabled?: boolean;
};

export function useMenuReadList(
  options?: UseMenuReadListOptions,
): UseQueryResult<Array<IMenu>, Error> {
  const authentication = useAuthStore();
  const isAuthenticated = Boolean(authentication.user?._id);

  return useQuery({
    ...menuAllOptions(),
    enabled: options?.enabled ?? isAuthenticated,
  });
}
