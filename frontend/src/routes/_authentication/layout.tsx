import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

import { AuthShell } from '@/components/common/auth-shell';
import {
  menuAllOptions,
  profileDetailOptions,
  setupStatusOptions,
} from '@/hooks/tanstack-query/_query-options';
import { resolveInitialMenuRoute } from '@/lib/menu/initial-menu-route';
import { ROLE_DEFAULT_ROUTE } from '@/lib/menu/menu-access-permissions';

export const Route = createFileRoute('/_authentication')({
  beforeLoad: async ({ context, location }) => {
    const isResetPassword =
      location.pathname === '/forgot-password/reset-password';
    const isAddingAccount =
      typeof location.search === 'object' &&
      location.search !== null &&
      'addAccount' in location.search;

    if (isResetPassword) return;

    const setupStatus =
      await context.queryClient.fetchQuery(setupStatusOptions());

    if (!setupStatus.completed) {
      const step = setupStatus.currentStep ?? 'admin';
      throw redirect({ to: `/setup/${step}` });
    }

    if (isAddingAccount) return;

    try {
      const user = await context.queryClient.ensureQueryData(
        profileDetailOptions(),
      );
      if (user) {
        const role = user.group?.slug?.toUpperCase() ?? 'REGISTERED';
        const fallbackRoute = ROLE_DEFAULT_ROUTE[role] ?? '/tables';
        const menus = await context.queryClient.fetchQuery(menuAllOptions());
        const initialRoute = resolveInitialMenuRoute(menus);

        if (initialRoute?.type === 'external') {
          throw redirect({ href: initialRoute.href });
        }

        throw redirect({ to: initialRoute?.to ?? fallbackRoute });
      }
    } catch (e) {
      if (e && typeof e === 'object' && 'to' in e) throw e;
    }
  },
  component: () => (
    <div data-test-id="auth-layout">
      <AuthShell>
        <Outlet />
      </AuthShell>
    </div>
  ),
});
