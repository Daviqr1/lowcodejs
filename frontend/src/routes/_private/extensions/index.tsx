import { createFileRoute, redirect } from '@tanstack/react-router';

import { ExtensionsPageSkeleton } from './-extensions-page-skeleton';

import { extensionListOptions } from '@/hooks/tanstack-query/_query-options';
import { createRouteHead } from '@/lib/seo';

export const Route = createFileRoute('/_private/extensions/')({
  beforeLoad: async () => {
    const { useAuthStore } = await import('@/stores/authentication');
    const role = useAuthStore.getState().user?.group?.slug?.toUpperCase();
    if (role !== 'MASTER') {
      throw redirect({ to: '/tables' });
    }
  },
  head: createRouteHead({ title: 'Extensões' }),
  pendingComponent: ExtensionsPageSkeleton,
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(extensionListOptions());
  },
});
