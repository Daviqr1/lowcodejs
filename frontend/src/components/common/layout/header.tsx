import { useLocation } from '@tanstack/react-router';
import React from 'react';

import { LoginButton } from './login-button';
import { NotificationBell } from './notification-bell';
import { Profile } from './profile';
import { ThemeToggle } from './theme-toggle';

import { InputSearch } from '@/components/common/input-search';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuthStore } from '@/stores/authentication';

type HeaderProps = {
  routesWithoutSearchInput: Array<string | RegExp>;
};

export function Header({
  routesWithoutSearchInput,
}: HeaderProps): React.JSX.Element {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = Boolean(user);

  const showSearchInput = !routesWithoutSearchInput.some((route) => {
    if (route instanceof RegExp) {
      return route.test(location.pathname);
    }
    return location.pathname === route;
  });

  let authContent = <LoginButton />;
  if (isAuthenticated) {
    authContent = <Profile />;
  }

  return (
    <header
      data-slot="header"
      data-test-id="app-header"
      className="w-full py-4 inline-flex gap-2 px-4 justify-center border-b "
    >
      <nav
        data-test-id="header-nav"
        className="container max-w-full items-center inline-flex justify-between gap-4 h-8"
      >
        {isAuthenticated && (
          <SidebarTrigger
            data-test-id="sidebar-trigger-btn"
            className="cursor-pointer rounded-sm shadow-none h-full w-8"
            variant="outline"
            size="icon"
          />
        )}
        <div className="inline-flex gap-2 w-full items-center">
          {showSearchInput && <InputSearch />}
        </div>
        <div className="inline-flex gap-2 items-center">
          <ThemeToggle />
          {isAuthenticated && <NotificationBell />}
          {authContent}
        </div>
      </nav>
    </header>
  );
}
