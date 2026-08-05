import { QueryErrorResetBoundary, useQuery } from '@tanstack/react-query';
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { Header } from '@/components/common/layout/header';
import { Sidebar } from '@/components/common/layout/sidebar';
import { RouteError } from '@/components/common/route-status/route-error';
import { RoutePending } from '@/components/common/route-status/route-pending';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import {
  accountsOptions,
  profileDetailOptions,
  settingOptions,
  setupStatusOptions,
} from '@/hooks/tanstack-query/_query-options';
import { useMenuDynamic } from '@/hooks/tanstack-query/use-menu-dynamic';
import { API } from '@/lib/api';
import type { IAuthenticationAccounts, IUser } from '@/lib/interfaces';
import { serverRefreshSession } from '@/lib/server/refresh-session';
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
      await context.queryClient.ensureQueryData(setupStatusOptions());

    if (!setupStatus.completed) {
      throw redirect({
        to: `/setup/${setupStatus.currentStep ?? 'admin'}`,
      });
    }

    // O store zustand e um singleton de modulo. No servidor ele seria
    // compartilhado por todas as requisicoes do processo Nitro, misturando a
    // identidade de usuarios diferentes — por isso so o navegador escreve nele.
    // Em SSR quem carrega a sessao e o QueryClient da requisicao, e o
    // `PrivateLayout` sincroniza o store depois da hidratacao.
    const seedStoreOnBrowser = (
      accounts: Array<IUser>,
      activeAccountId: string | null,
      user: IUser,
    ): void => {
      if (typeof window === 'undefined') return;

      useAuthStore.getState().setAccounts(accounts, activeAccountId);
      // Sessao sem contas indexadas ainda precisa popular o store.
      if (accounts.length === 0) useAuthStore.getState().setUser(user);
    };

    const seedSession = (
      accounts: Array<IUser>,
      activeAccountId: string | null,
      user: IUser,
    ): void => {
      seedStoreOnBrowser(accounts, activeAccountId, user);
      context.queryClient.setQueryData(profileDetailOptions().queryKey, user);
      context.queryClient.prefetchQuery(settingOptions());
    };

    try {
      // /authentication/accounts resolve a conta ativa pelos cookies e devolve a
      // lista; o store para de mandar id stale no GET /profile.
      const accountsResponse =
        await context.queryClient.ensureQueryData(accountsOptions());

      const user = await context.queryClient.ensureQueryData(
        profileDetailOptions(),
      );

      seedStoreOnBrowser(
        accountsResponse.accounts,
        accountsResponse.activeAccountId,
        user,
      );

      context.queryClient.prefetchQuery(settingOptions());
    } catch {
      // SSR não renova o access token pelo interceptor (que é client-only).
      // Renova server-side, repassa os cookies novos ao browser e refaz a carga
      // com eles. No client, o interceptor do axios já trata o 401.
      if (typeof window === 'undefined') {
        const refreshed = await serverRefreshSession();
        if (refreshed.ok && refreshed.cookie) {
          try {
            const headers = { Cookie: refreshed.cookie };
            const accountsResponse = await API.get<IAuthenticationAccounts>(
              '/authentication/accounts',
              { headers },
            );
            const profileResponse = await API.get<IUser>('/profile', {
              headers,
            });
            seedSession(
              accountsResponse.data.accounts,
              accountsResponse.data.activeAccountId,
              profileResponse.data,
            );
            return;
          } catch {
            /* refresh recuperou cookies mas o retry falhou; cai pro fluxo abaixo */
          }
        }
      }

      if (typeof window !== 'undefined') useAuthStore.getState().clear();

      // Permitir acesso público a rotas de visualização de tabela
      // O componente e o backend controlam por visibility
      const isTableViewRoute =
        /^\/tables\/[^/]+(?:\/?|\/row\/?.*)$/.test(location.pathname) ||
        // URL amigavel do registro: /tables/:slug/:rowSlug — mesmo tratamento
        // publico de /tables/:slug/row (exclui sub-rotas reservadas).
        /^\/tables\/[^/]+\/(?!(?:row|detail|field|methods|group)(?:\/|$))[^/]+\/?$/.test(
          location.pathname,
        );
      if (isTableViewRoute) {
        return;
      }

      throw redirect({ to: '/' });
    }
  },
});

/**
 * Reidrata o store zustand no navegador a partir do cache da requisicao.
 *
 * Num hard load o `beforeLoad` roda no servidor, onde o store nao pode ser
 * escrito (singleton compartilhado entre requisicoes). Sem esta sincronizacao o
 * cliente hidratava com o store vazio: o switcher aparecia sem contas e o
 * layout renderizava o shell de deslogado apesar da sessao estar valida.
 */
function useSyncAuthStore(): void {
  const { data: accountsData } = useQuery(accountsOptions());
  const { data: profile } = useQuery(profileDetailOptions());

  React.useEffect(() => {
    if (!profile) return;

    if (accountsData && accountsData.accounts.length > 0) {
      useAuthStore
        .getState()
        .setAccounts(accountsData.accounts, accountsData.activeAccountId);
      return;
    }

    useAuthStore.getState().setUser(profile);
  }, [profile, accountsData]);
}

function PrivateLayout(): React.JSX.Element {
  useSyncAuthStore();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = Boolean(user);

  const { menu } = useMenuDynamic();

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
    /^\/tables\/[^/]+\/row.*$/,
    /^\/tables\/[^/]+\/detail$/,
    /^\/tables\/[^/]+\/methods$/,
    /^\/users\/.+$/,
    '/users/create',
    '/tables/new',
    '/tools',
    /^\/tools\/.+\/.+$/,
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
              <div className="flex flex-col h-dvh overflow-hidden px-4 sm:px-2 w-full">
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
        className="relative flex flex-col h-dvh w-screen overflow-hidden flex-1 px-4 sm:px-2"
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
