import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, createLazyFileRoute } from '@tanstack/react-router';
import * as LucideIcons from 'lucide-react';
import { FileCode2Icon, WrenchIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import React from 'react';

import { PageHeader, PageShell } from '@/components/common/page-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { extensionActiveListOptions } from '@/hooks/tanstack-query/use-extensions-active-list';
import { E_EXTENSION_TYPE } from '@/lib/constant';

export const Route = createLazyFileRoute('/_private/tools/')({
  component: RouteComponent,
});

function resolveLucideIcon(name: string | null | undefined): LucideIcon {
  if (!name) return WrenchIcon;
  // Lookup dinamico de icone pelo nome no namespace do lucide-react; o valor
  // vem sem tipo especifico, por isso os casts pontuais (lib-forced).
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const candidate = (LucideIcons as Record<string, unknown>)[name];
  if (typeof candidate === 'function' || typeof candidate === 'object') {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return candidate as LucideIcon;
  }
  return WrenchIcon;
}

function RouteComponent(): React.JSX.Element {
  const { data } = useSuspenseQuery(extensionActiveListOptions());

  const tools = React.useMemo(
    () => data.filter((e) => e.type === E_EXTENSION_TYPE.TOOL),
    [data],
  );

  return (
    <PageShell data-test-id="tools-page">
      <PageShell.Header>
        <PageHeader title="Ferramentas" />
      </PageShell.Header>

      <PageShell.Content className="p-4">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          <Link
            to="/tables/schema-import"
            className="block"
            data-test-id="tool-card-schema-import"
          >
            <Card className="hover:bg-accent/50 transition-colors h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode2Icon className="size-5 text-primary" />
                  <span>Importar Schema</span>
                </CardTitle>
                <CardDescription>
                  Crie várias tabelas de uma vez via arquivo YAML declarativo
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground font-mono">
                core/schema-import
              </CardContent>
            </Card>
          </Link>

          {tools.map((tool) => {
            const Icon = resolveLucideIcon(tool.icon);
            return (
              <Link
                key={tool._id}
                to="/tools/$package/$id"
                params={{ package: tool.pkg, id: tool.extensionId }}
                className="block"
                data-test-id={`tool-card-${tool.extensionId}`}
              >
                <Card className="hover:bg-accent/50 transition-colors h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="size-5 text-primary" />
                      <span>{tool.name}</span>
                    </CardTitle>
                    <CardDescription>
                      {tool.description ?? 'Sem descrição'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground font-mono">
                    {tool.pkg}/{tool.extensionId}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </PageShell.Content>
    </PageShell>
  );
}
