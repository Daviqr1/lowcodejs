import React from 'react';

import { PageHeader, PageShell } from '@/components/common/page-shell';
import { Skeleton } from '@/components/ui/skeleton';

export function ExtensionsPageSkeleton(): React.JSX.Element {
  return (
    <PageShell>
      <PageShell.Header>
        <PageHeader title="Extensões" />
      </PageShell.Header>
      <PageShell.Content className="p-4 space-y-4">
        <Skeleton className="h-4 w-24" />
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-44 w-full rounded-xl"
            />
          ))}
        </div>
      </PageShell.Content>
    </PageShell>
  );
}
