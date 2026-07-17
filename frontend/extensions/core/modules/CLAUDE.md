# `core/modules` (frontend)

Entries React dos módulos do pacote `core`. Módulos são telas com URL própria
(`/e/<pkg>/<id>`), montadas pela rota dinâmica
`routes/_private/e/$package/$id/`. A declaração canônica vive em
`backend/extensions/core/modules/`.

## Extensões

| ID        | URL default       | Entry               | Descrição                                                               |
| --------- | ----------------- | ------------------- | ----------------------------------------------------------------------- |
| `welcome` | `/e/core/welcome` | `welcome/index.tsx` | Página de boas-vindas com atalhos para Tabelas, Ferramentas e Extensões |

## welcome

`PageShell` com saudação (`Bem-vindo ao {SYSTEM_NAME}`, lido de
`useSettingRead`) e três `ShortcutCard` que linkam para `/tables`, `/tools` e
`/extensions`. O texto explica que o módulo pode ser anexado a um item de menu
do tipo **Módulo de Extensão** (via `/menus/create`) para servir de página
inicial do sistema (ex.: `/` ou `/home`).

## Convenções

- Entry é **index.tsx** com `export default function ...`
- Sem props (página completa) — usa hooks normais (TanStack Query, Router)
- Importa livremente de `@/components/ui/*`, `@/components/common/*` e
  `@/hooks/...`
