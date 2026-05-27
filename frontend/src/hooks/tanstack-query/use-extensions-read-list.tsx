import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { extensionListOptions } from './_query-options';

import type { IExtension } from '@/lib/interfaces';
import { useAuthStore } from '@/stores/authentication';

interface UseExtensionsReadListOptions {
  enabled?: boolean;
}

export function useExtensionsReadList(
  options?: UseExtensionsReadListOptions,
): UseQueryResult<Array<IExtension>, Error> {
  const authentication = useAuthStore();
  const isAuthenticated = Boolean(authentication.user?._id);

  return useQuery({
    ...extensionListOptions(),
    enabled: options?.enabled ?? isAuthenticated,
  });
}
