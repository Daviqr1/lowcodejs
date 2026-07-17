import type * as React from 'react';

import { BrandPanel } from './brand-panel';

import { Logo } from '@/components/common/layout/logo';
import { cn } from '@/lib/utils';

type AuthShellProps = {
  children: React.ReactNode;
  contentClassName?: string;
};

export function AuthShell({
  children,
  contentClassName,
}: AuthShellProps): React.JSX.Element {
  return (
    <div
      data-slot="auth-shell"
      className="min-h-svh lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
    >
      <BrandPanel className="hidden lg:flex" />

      <main className="bg-ambient-cool relative flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-10 sm:px-6 lg:min-h-0 lg:py-16">
        <Logo className="h-7 w-auto lg:hidden" />

        <div
          className={cn('animate-rise-in w-full max-w-md', contentClassName)}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
