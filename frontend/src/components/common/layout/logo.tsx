import { getRouteApi } from '@tanstack/react-router';

import { cn } from '@/lib/utils';

const rootApi = getRouteApi('__root__');

export function Logo({ className }: { className?: string }): React.JSX.Element {
  const { baseUrl, logoLargeDarkUrl } = rootApi.useLoaderData();
  const lightSrc = `${baseUrl}/storage/logo-large.webp`;
  const darkSrc = logoLargeDarkUrl || lightSrc;

  return (
    <>
      <img
        data-slot="logo"
        data-test-id="app-logo"
        src={lightSrc}
        alt="Logo"
        className={cn(className, 'dark:hidden')}
      />
      <img
        data-slot="logo"
        data-test-id="app-logo"
        src={darkSrc}
        alt="Logo"
        className={cn(className, 'hidden dark:block')}
      />
    </>
  );
}
