import { useSuspenseQuery } from '@tanstack/react-query';
import { createLazyFileRoute } from '@tanstack/react-router';
import React, { Suspense } from 'react';

import { PageHeader, PageShell } from '@/components/common/page-shell';
import { RouteNotFound } from '@/components/common/route-status/route-not-found';
import { Spinner } from '@/components/ui/spinner';
import { extensionListOptions } from '@/hooks/tanstack-query/_query-options';
import { E_EXTENSION_TYPE } from '@/lib/constant';
import { loadExtensionEntry } from '@/lib/extensions-registry';

export const Route = createLazyFileRoute('/_private/tools/$package/$id/')({
  component: RouteComponent,
});

function ToolLoadingState(): React.JSX.Element {
  return (
    <PageShell>
      <PageShell.Header>
        <PageHeader title="Carregando ferramenta..." />
      </PageShell.Header>
      <PageShell.Content className="p-4 flex items-center justify-center">
        <Spinner />
      </PageShell.Content>
    </PageShell>
  );
}

function RouteComponent(): React.JSX.Element {
  const { package: pkg, id } = Route.useParams();
  const { data: extensions } = useSuspenseQuery(extensionListOptions());

  const extension = React.useMemo(
    () =>
      extensions.find(
        (e) =>
          e.pkg === pkg &&
          e.type === E_EXTENSION_TYPE.TOOL &&
          e.extensionId === id,
      ),
    [extensions, pkg, id],
  );

  const LazyEntry = React.useMemo(() => {
    return React.lazy(async () => {
      const Entry = await loadExtensionEntry(pkg, 'tools', id);
      if (!Entry) {
        const Fallback: React.ComponentType<Record<string, unknown>> = () => (
          <RouteNotFound />
        );
        return { default: Fallback };
      }
      return { default: Entry };
    });
  }, [pkg, id]);

  if (!extension) {
    return <RouteNotFound />;
  }

  return (
    <Suspense fallback={<ToolLoadingState />}>
      <LazyEntry />
    </Suspense>
  );
}
