import { createFileRoute, redirect } from '@tanstack/react-router';

import { ExtensionsPageSkeleton } from './-extensions-page-skeleton';

import { extensionListOptions } from '@/hooks/tanstack-query/_query-options';
import { E_AREA_CAPABILITY } from '@/lib/constant';
import { hasAreaCapability } from '@/lib/menu/menu-access-permissions';
import { createRouteHead } from '@/lib/seo';

export const Route = createFileRoute('/_private/extensions/')({
  beforeLoad: async () => {
    const { useAuthStore } = await import('@/stores/authentication');
    const capabilities = useAuthStore.getState().user?.capabilities;
    if (!hasAreaCapability(capabilities, E_AREA_CAPABILITY.MANAGE_TOOLS)) {
      throw redirect({ to: '/tables' });
    }
  },
  head: createRouteHead({ title: 'Extensões' }),
  pendingComponent: ExtensionsPageSkeleton,
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(extensionListOptions());
  },
});
