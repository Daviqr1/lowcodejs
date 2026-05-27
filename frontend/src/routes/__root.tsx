import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import type * as React from 'react';
import { Toaster } from 'sonner';

import { RouteError } from '@/components/common/route-status/route-error';
import { RouteNotFound } from '@/components/common/route-status/route-not-found';
import { RoutePending } from '@/components/common/route-status/route-pending';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getApiBaseUrl, getAppBaseUrl } from '@/lib/get-api-config';
import type { RouterContext } from '@/router';
import appCss from '@/styles.css?url';

const getSystemSettings = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const { Env } = await import('@/env');
      // SSR usa INTERNAL_API_URL (hostname interno do compose) quando definido;
      // fallback pra VITE_API_BASE_URL (que vale tanto pro client quanto pra
      // SSR fora de Docker).
      const baseUrl = process.env['INTERNAL_API_URL'] || Env.VITE_API_BASE_URL;
      const response = await fetch(`${baseUrl}/setting/public`);
      if (response.ok) {
        const data = await response.json();
        return {
          systemName: data.SYSTEM_NAME || 'LowCodeJs',
          systemDescription: data.SYSTEM_DESCRIPTION || 'Plataforma Oficial',
          aiAssistantEnabled: data.AI_ASSISTANT_ENABLED ?? false,
          setupCompleted: data.SETUP_COMPLETED ?? false,
          setupCurrentStep: data.SETUP_CURRENT_STEP ?? 'admin',
        };
      }
      return {
        systemName: 'LowCodeJs',
        systemDescription: 'Plataforma Oficial',
        aiAssistantEnabled: false,
        setupCompleted: false,
        setupCurrentStep: 'admin',
      };
    } catch {
      return {
        systemName: 'LowCodeJs',
        systemDescription: 'Plataforma Oficial',
        aiAssistantEnabled: false,
        setupCompleted: false,
        setupCurrentStep: 'admin',
      };
    }
  },
);

export const Route = createRootRouteWithContext<RouterContext>()({
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
