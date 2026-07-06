/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import * as TanstackQuery from './integrations/tanstack-query/root-provider';
import { routeTree } from './routeTree.gen';

import { QueryClient as queryClient } from '@/lib/query-client';

export type RouterContext = {
  queryClient: QueryClient;
};

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 0,
    scrollRestoration: true,
    defaultStructuralSharing: true,
    Wrap: (props: { children: React.ReactNode }) => {
      return <TanstackQuery.Provider>{props.children}</TanstackQuery.Provider>;
    },
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
};

declare module '@tanstack/react-router' {
  // Module augmentation exige interface (declaration merging) — nao usar type.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- augmentation em .tsx: o TS exige interface p/ declaration merging
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
