import { Link } from '@tanstack/react-router';
import {
  ArrowRightIcon,
  PuzzleIcon,
  TableIcon,
  WrenchIcon,
} from 'lucide-react';
import React from 'react';

import { PageHeader, PageShell } from '@/components/common/page-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSettingRead } from '@/hooks/tanstack-query/use-setting-read';

interface ShortcutCardProps {
  to: '/tables' | '/extensions' | '/tools';
  icon: typeof TableIcon;
  title: string;
  description: string;
}

function ShortcutCard({
  to,
  icon: Icon,
  title,
  description,
}: ShortcutCardProps): React.JSX.Element {
  return (
    <Link
      to={to}
      className="block"
    >
      <Card className="hover:bg-accent/50 transition-colors h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="size-5 text-primary" />
            <span>{title}</span>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto text-sm text-muted-foreground inline-flex items-center gap-1">
          Ir para {title.toLowerCase()}
          <ArrowRightIcon className="size-3" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function WelcomeModule(): React.JSX.Element {
  const setting = useSettingRead();
  let systemName = 'LowCodeJS';
  if (setting.status === 'success') systemName = setting.data.SYSTEM_NAME;

  return (
    <PageShell data-test-id="module-welcome">
      <PageShell.Header>
        <PageHeader title={`Bem-vindo ao ${systemName}`} />
      </PageShell.Header>

      <PageShell.Content className="p-4">
        <div className="max-w-3xl space-y-4">
          <p className="text-muted-foreground">
            Esta é uma página de boas-vindas oferecida pela extensão
            <code className="mx-1 px-1 py-0.5 rounded bg-muted text-xs font-mono">
              core/welcome
            </code>
            . Você pode anexar este módulo a um item de menu via
            <Link
              to="/menus/create"
              className="ml-1 underline underline-offset-4 hover:text-primary"
            >
              Menus → Criar
            </Link>
            (tipo <strong>Módulo de Extensão</strong>) para apresentá-la como
            página inicial do sistema.
          </p>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <ShortcutCard
              to="/tables"
              icon={TableIcon}
              title="Tabelas"
              description="Crie e gerencie tabelas dinâmicas com campos tipados."
            />
            <ShortcutCard
              to="/tools"
              icon={WrenchIcon}
              title="Ferramentas"
              description="Acesse ferramentas administrativas como Clonar Tabela."
            />
            <ShortcutCard
              to="/extensions"
              icon={PuzzleIcon}
              title="Extensões"
              description="Ative ou desative plugins, módulos e ferramentas."
            />
          </div>
        </div>
      </PageShell.Content>
    </PageShell>
  );
}
