import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { Header } from '@/components/common/layout/header';
import { Sidebar } from '@/components/common/layout/sidebar';
import { RouteError } from '@/components/common/route-status/route-error';
import { RoutePending } from '@/components/common/route-status/route-pending';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import {
  profileDetailOptions,
  settingOptions,
  setupStatusOptions,
} from '@/hooks/tanstack-query/_query-options';
import { useMenuDynamic } from '@/hooks/tanstack-query/use-menu-dynamic';
import { E_ROLE } from '@/lib/constant';
import { useAuthStore } from '@/stores/authentication';

export const Route = createFileRoute('/_private')({
  component: PrivateLayout,
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  ssr: 'data-only',
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  }),
  beforeLoad: async ({ context, location }) => {
    const setupStatus =
      await context.queryClient.fetchQuery(setupStatusOptions());

    if (!setupStatus.completed) {
      throw redirect({
        to: `/setup/${setupStatus.currentStep ?? 'admin'}`,
      });
    }

    try {
      const user = await context.queryClient.ensureQueryData(
        profileDetailOptions(),
      );
      useAuthStore.getState().setUser(user);
      context.queryClient.prefetchQuery(settingOptions());
    } catch {
      useAuthStore.getState().clear();

      // Permitir acesso público a rotas de visualização de tabela
      // O componente e o backend controlam por visibility
      const isTableViewRoute = /^\/tables\/[^/]+(?:\/?|\/row\/[^/]+\/?)$/.test(
        location.pathname,
      );
      if (isTableViewRoute) {
        return;
      }

      throw redirect({ to: '/' });
    }
  },
});

function PrivateLayout(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = Boolean(user);
  const role = user?.group?.slug?.toUpperCase() ?? E_ROLE.REGISTERED;

  const { menu } = useMenuDynamic(role);

  const routesWithoutSearchInput: Array<string | RegExp> = [
    '/',
    '/dashboard',
    /^\/groups\/.+$/,
    '/groups/create',
    /^\/menus\/.+$/,
    '/menus/create',
    /^\/pages\/.+$/,
    '/profile',
    '/settings',
    /^\/tables\/[^/]+\/field\/.+$/,
    /^\/tables\/[^/]+\/field\/create$/,
    /^\/tables\/[^/]+\/row\/.+$/,
    /^\/tables\/[^/]+\/row\/create$/,
    /^\/tables\/[^/]+\/detail$/,
    /^\/tables\/[^/]+\/methods$/,
    /^\/users\/.+$/,
    '/users/create',
    '/tables/new',
    '/tools',
    '/extensions',
  ];

  if (!isAuthenticated) {
    return (
      <SidebarProvider>
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary }) => (
                <RouteError
                  error={new Error('Erro ao carregar dados')}
                  resetErrorBoundary={resetErrorBoundary}
                />
              )}
            >
              <div className="flex flex-col h-screen overflow-hidden px-4 sm:px-2 w-full">
                <Header routesWithoutSearchInput={routesWithoutSearchInput} />
                <Outlet />
              </div>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar menu={menu} />
      <SidebarInset
        className="relative flex flex-col h-screen w-screen overflow-hidden flex-1 px-4 sm:px-2"
        data-test-id="private-layout"
      >
        <Header routesWithoutSearchInput={routesWithoutSearchInput} />
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary }) => (
                <RouteError
                  error={new Error('Erro ao carregar dados')}
                  resetErrorBoundary={resetErrorBoundary}
                />
              )}
            >
              <Outlet />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </SidebarInset>
    </SidebarProvider>
  );
}
