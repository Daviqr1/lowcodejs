import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

type Section = {
  title: string;
  description?: string;
  items: Array<{ name: string; hint?: string }>;
};

const SECTIONS: Array<Section> = [
  {
    title: 'Tipos de campo (type)',
    description: 'Use um destes valores em "type:" de cada campo.',
    items: [
      {
        name: 'TEXT_SHORT',
        hint: 'Texto curto. Use com format para EMAIL/INTEGER/DECIMAL/etc.',
      },
      {
        name: 'TEXT_LONG',
        hint: 'Texto longo. Use com format: RICH_TEXT ou PLAIN_TEXT.',
      },
      { name: 'DATE', hint: 'Data. Use com format: DD_MM_YYYY (ou outros).' },
      { name: 'DROPDOWN', hint: 'Seletor com options inline (label + color).' },
      { name: 'FILE', hint: 'Anexo de arquivo.' },
      { name: 'USER', hint: 'Referência a um usuário do sistema.' },
      {
        name: 'USER_GROUP',
        hint: 'Referência a um ou mais grupos de usuários.',
      },
      { name: 'CATEGORY', hint: 'Árvore de categorias.' },
      {
        name: 'RELATIONSHIP',
        hint: 'Referência a outra tabela (use bloco relationship).',
      },
    ],
  },
  {
    title: 'Formatos (format)',
    description:
      'Opcional. Combina com type — veja quais valem para cada tipo.',
    items: [
      { name: 'ALPHA_NUMERIC', hint: 'TEXT_SHORT' },
      { name: 'INTEGER', hint: 'TEXT_SHORT — números inteiros' },
      { name: 'DECIMAL', hint: 'TEXT_SHORT — números decimais' },
      { name: 'URL', hint: 'TEXT_SHORT' },
      { name: 'EMAIL', hint: 'TEXT_SHORT' },
      { name: 'PASSWORD', hint: 'TEXT_SHORT' },
      { name: 'PHONE', hint: 'TEXT_SHORT' },
      { name: 'CNPJ', hint: 'TEXT_SHORT' },
      { name: 'CPF', hint: 'TEXT_SHORT' },
      { name: 'RICH_TEXT', hint: 'TEXT_LONG' },
      { name: 'PLAIN_TEXT', hint: 'TEXT_LONG' },
      { name: 'DD_MM_YYYY', hint: 'DATE — 31/12/2025' },
      { name: 'MM_DD_YYYY', hint: 'DATE — 12/31/2025' },
      { name: 'YYYY_MM_DD', hint: 'DATE — 2025/12/31' },
      { name: 'DD_MM_YYYY_HH_MM_SS', hint: 'DATE — com hora' },
    ],
  },
  {
    title: 'Style de tabela (style)',
    description: 'Visualização padrão da tabela. Opcional.',
    items: [
      { name: 'LIST', hint: 'Lista (default)' },
      { name: 'GALLERY' },
      { name: 'CARD' },
      { name: 'MOSAIC' },
      { name: 'KANBAN' },
      { name: 'CALENDAR' },
      { name: 'GANTT' },
      { name: 'DOCUMENT' },
      { name: 'FORUM' },
    ],
  },
  {
    title: 'Visibilidade (visibility)',
    description: 'Quem consegue ver a tabela. Default: PRIVATE.',
    items: [
      { name: 'PRIVATE', hint: 'Só o dono e admins' },
      { name: 'RESTRICTED', hint: 'Só usuários autorizados (default na UI)' },
      { name: 'OPEN', hint: 'Qualquer usuário autenticado' },
      { name: 'FORM', hint: 'Visitantes podem criar registros' },
      { name: 'PUBLIC', hint: 'Visualização aberta a visitantes' },
    ],
  },
  {
    title: 'Propriedades de campo',
    description: 'Todas opcionais. Aplicam-se a qualquer type.',
    items: [
      { name: 'required: true', hint: 'Campo obrigatório no formulário' },
      { name: 'multiple: true', hint: 'Permite múltiplos valores' },
      { name: 'showInFilter: true', hint: 'Permite filtrar por este campo' },
      {
        name: 'permissions: { list, form, detail }',
        hint: 'Visibilidade por contexto. Cada um: { kind: PUBLIC | NOBODY | GROUP, group }',
      },
      { name: 'defaultValue: "..."', hint: 'Valor inicial (string ou lista)' },
    ],
  },
];

export function SchemaReference(): React.JSX.Element {
  const [open, setOpen] = React.useState<Record<string, boolean>>({
    'Tipos de campo (type)': true,
  });

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Referência
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tipos e propriedades aceitos no YAML. Clique para expandir.
        </p>
      </div>

      {SECTIONS.map((section) => {
        const isOpen = !!open[section.title];
        return (
          <div
            key={section.title}
            className="rounded-md border bg-card/40 overflow-hidden"
          >
            <button
              type="button"
              onClick={() =>
                setOpen((prev) => ({ ...prev, [section.title]: !isOpen }))
              }
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-accent/40"
            >
              {isOpen && <ChevronDownIcon className="h-3.5 w-3.5" />}
              {!isOpen && <ChevronRightIcon className="h-3.5 w-3.5" />}
              {section.title}
            </button>

            <div
              className={cn(
                'flex flex-col gap-1 px-3 pb-2',
                !isOpen && 'hidden',
              )}
            >
              {section.description && (
                <p className="text-[11px] text-muted-foreground mb-1">
                  {section.description}
                </p>
              )}
              {section.items.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col gap-0.5 rounded px-1.5 py-1 hover:bg-accent/30"
                >
                  <code className="text-[11px] font-mono text-foreground">
                    {item.name}
                  </code>
                  {item.hint && (
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      {item.hint}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
