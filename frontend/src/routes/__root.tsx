import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import type * as React from 'react';

import { RouteError } from '@/components/common/route-status/route-error';
import { RouteNotFound } from '@/components/common/route-status/route-not-found';
import { RoutePending } from '@/components/common/route-status/route-pending';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getApiBaseUrl, getAppBaseUrl } from '@/lib/get-api-config';
import type { RouterContext } from '@/router';
import appCss from '@/styles.css?url';

const getSystemSettings = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const { Env } = await import('@/env');
      const baseUrl = Env.VITE_API_BASE_URL;
      const response = await fetch(`${baseUrl}/setting/public`);
      if (response.ok) {
        const data = await response.json();
        return {
          systemName: data.SYSTEM_NAME || 'LowCodeJs',
          systemDescription: data.SYSTEM_DESCRIPTION || 'Plataforma Oficial',
          aiAssistantEnabled: data.AI_ASSISTANT_ENABLED ?? false,
          chatHistoryEnabled: data.CHAT_HISTORY_ENABLED ?? false,
          setupCompleted: data.SETUP_COMPLETED ?? false,
          setupCurrentStep: data.SETUP_CURRENT_STEP ?? 'admin',
          logoSmallDarkUrl: data.LOGO_SMALL_DARK_URL ?? null,
          logoLargeDarkUrl: data.LOGO_LARGE_DARK_URL ?? null,
          loginBackgroundUrl: data.LOGIN_BACKGROUND_URL ?? null,
        };
      }
      return {
        systemName: 'LowCodeJs',
        systemDescription: 'Plataforma Oficial',
        aiAssistantEnabled: false,
        chatHistoryEnabled: false,
        setupCompleted: false,
        setupCurrentStep: 'admin',
        logoSmallDarkUrl: null,
        logoLargeDarkUrl: null,
        loginBackgroundUrl: null,
      };
    } catch {
      return {
        systemName: 'LowCodeJs',
        systemDescription: 'Plataforma Oficial',
        aiAssistantEnabled: false,
        chatHistoryEnabled: false,
        setupCompleted: false,
        setupCurrentStep: 'admin',
        logoSmallDarkUrl: null,
        logoLargeDarkUrl: null,
        loginBackgroundUrl: null,
      };
    }
  },
);

export const Route = createRootRouteWithContext<RouterContext>()({
  // O loader usa serverFns crus (baseUrl/appUrl/settings de bootstrap+meta),
  // que nao passam pelo cache do React Query. Sem staleTime, o `intent` preload
  // re-dispara o trio de serverFns a cada hover na sidebar. Esses dados sao
  // estaticos na sessao, entao nunca precisam re-preloadar.
  preloadStaleTime: Infinity,
  staleTime: Infinity,
  loader: async () => {
    const [baseUrl, appUrl, settings] = await Promise.all([
      getApiBaseUrl(),
      getAppBaseUrl(),
      getSystemSettings(),
    ]);
    return {
      baseUrl,
      appUrl,
      systemName: settings.systemName,
      systemDescription: settings.systemDescription,
      aiAssistantEnabled: settings.aiAssistantEnabled,
      chatHistoryEnabled: settings.chatHistoryEnabled,
      logoSmallDarkUrl: settings.logoSmallDarkUrl,
      logoLargeDarkUrl: settings.logoLargeDarkUrl,
      loginBackgroundUrl: settings.loginBackgroundUrl,
    };
  },
  component: RootDocument,
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  head: ({ loaderData }) => {
    const systemName = loaderData?.systemName || 'LowCodeJs';
    const systemDescription =
      loaderData?.systemDescription || 'Plataforma Oficial';
    const appUrl = loaderData?.appUrl || '';
    const baseUrl = loaderData?.baseUrl || '';
    const ogImage = `${baseUrl}/storage/logo-small.webp`;

    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: systemName },
        { name: 'description', content: systemDescription },
        { property: 'og:title', content: systemName },
        { property: 'og:description', content: systemDescription },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: appUrl },
        { property: 'og:image', content: ogImage },
        { property: 'og:image:width', content: '200' },
        { property: 'og:image:height', content: '200' },
        { property: 'og:site_name', content: systemName },
        { property: 'og:locale', content: 'pt_BR' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: systemName },
        { name: 'twitter:description', content: systemDescription },
        { name: 'twitter:image', content: ogImage },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        {
          rel: 'icon',
          type: 'image/webp',
          href: ogImage,
        },
        { rel: 'canonical', href: appUrl },
      ],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: systemName,
            description: systemDescription,
            url: appUrl,
            image: ogImage,
          }),
        },
      ],
    };
  },
});

function RootDocument(): React.JSX.Element {
  return (
    <html lang="pt-br">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme-preference') === 'dark' || (!('theme-preference' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <TooltipProvider>
          <Outlet />
          <Toaster />
        </TooltipProvider>
        <Scripts />
      </body>
    </html>
  );
}
