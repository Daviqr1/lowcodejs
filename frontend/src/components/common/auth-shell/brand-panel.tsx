import { getRouteApi } from '@tanstack/react-router';
import { DatabaseIcon, LayoutDashboardIcon, WorkflowIcon } from 'lucide-react';
import type * as React from 'react';

import { AppPreview } from './app-preview';

import { Logo } from '@/components/common/layout/logo';
import { cn } from '@/lib/utils';

const rootApi = getRouteApi('__root__');

interface BrandPanelProps {
  className?: string;
}

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FEATURES: Array<Feature> = [
  {
    icon: <DatabaseIcon className="size-4" />,
    title: 'Tabelas dinâmicas',
    description: 'Modele dados sem escrever schema na mão.',
  },
  {
    icon: <LayoutDashboardIcon className="size-4" />,
    title: 'Formulários & dashboards',
    description: 'Telas e relatórios gerados a partir das tabelas.',
  },
  {
    icon: <WorkflowIcon className="size-4" />,
    title: 'Automações',
    description: 'Regras e fluxos que rodam sozinhos.',
  },
];

export function BrandPanel({ className }: BrandPanelProps): React.JSX.Element {
  const { baseUrl, loginBackgroundUrl } = rootApi.useLoaderData();

  // Quando o MASTER configura uma imagem de fundo, ela substitui o painel
  // inteiro. `object-cover` garante que qualquer proporção/tamanho preenche o
  // espaço sem distorcer nem quebrar o layout.
  if (loginBackgroundUrl) {
    let src = `${baseUrl}${loginBackgroundUrl}`;
    if (/^https?:\/\//.test(loginBackgroundUrl)) src = loginBackgroundUrl;

    return (
      <aside
        data-slot="brand-panel"
        className={cn('relative isolate overflow-hidden', className)}
      >
        <img
          src={src}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover"
        />
      </aside>
    );
  }

  return (
    <aside
      data-slot="brand-panel"
      className={cn(
        'bg-brand-gradient grain-overlay relative isolate flex-col justify-between overflow-hidden p-10 xl:p-14',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-brand-orange/30 blur-3xl"
      />

      <AppPreview className="absolute right-[-2.5rem] bottom-12 z-[1] hidden lg:block" />

      <div className="animate-rise-in relative z-10">
        <span className="shadow-soft inline-flex rounded-xl bg-white/95 px-3.5 py-2.5">
          <Logo className="block h-7 w-auto" />
        </span>
      </div>

      <div className="relative z-10 max-w-md">
        <h2 className="animate-rise-in heading-section text-white">
          Construa aplicações sem escrever todo o{' '}
          <span className="text-brand-orange">código</span>
        </h2>
        <p className="animate-rise-in stagger-item mt-4 max-w-md text-lg leading-relaxed font-medium text-white/90">
          Tabelas, formulários, dashboards e automações numa plataforma só.
        </p>

        <ul className="mt-10 space-y-5">
          {FEATURES.map((feature, index) => {
            const itemStyle: React.CSSProperties = {
              animationDelay: `${(index + 2) * 80}ms`,
            };

            return (
              <li
                key={feature.title}
                style={itemStyle}
                className="animate-rise-in flex items-start gap-3"
              >
                <span className="hairline-white text-brand-orange mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                  {feature.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">
                    {feature.title}
                  </p>
                  <p className="text-[13px] leading-relaxed text-white/80">
                    {feature.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative z-10 flex items-center gap-2 text-sm text-white/80">
        <a
          href="https://lowcodejs.org"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2"
        >
          <span className="animate-pulse-soft bg-brand-orange inline-block size-2 rounded-full" />
          lowcodejs.org
        </a>
      </div>
    </aside>
  );
}
