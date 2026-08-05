import { createFileRoute } from '@tanstack/react-router';

import { UpdateSettingFormSkeleton } from './-update-form-skeleton';

import { settingOptions } from '@/hooks/tanstack-query/_query-options';
import { E_AREA_CAPABILITY } from '@/lib/constant';
import { hasAreaCapability } from '@/lib/menu/menu-access-permissions';
import { createRouteHead } from '@/lib/seo';

export const Route = createFileRoute('/_private/settings/')({
  beforeLoad: async ({ context }) => {
    const { getSessionUser } = await import('@/lib/session-user');
    const capabilities = getSessionUser(context.queryClient)?.capabilities;
    if (!hasAreaCapability(capabilities, E_AREA_CAPABILITY.MANAGE_SETTINGS)) {
      const { redirect } = await import('@tanstack/react-router');
      throw redirect({ to: '/tables' });
    }
  },
  head: createRouteHead({ title: 'Configurações' }),
  pendingComponent: UpdateSettingFormSkeleton,
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(settingOptions());
  },
});
