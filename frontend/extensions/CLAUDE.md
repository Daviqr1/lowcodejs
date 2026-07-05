# Extensions (frontend)

Espelho do `backend/extensions/` para o lado React. **Aqui mora apenas o código
de UI** (componentes, hooks, assets). A declaração canônica de uma extensão
(manifest.json + DB upsert) vive no backend — ver
`backend/extensions/CLAUDE.md`.

## Estrutura

```
frontend/extensions/
└── <pkg>/
    ├── plugins/<id>/index.tsx          ← entry component do plugin
    ├── modules/<id>/index.tsx          ← entry component do módulo
    └── tools/<id>/index.tsx            ← entry component da ferramenta
```

## Pacotes

| Pacote   | Conteúdo                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| `core/`  | Extensões oficiais (tools, plugins, módulos) — ver `core/CLAUDE.md`                                               |
| `forms/` | Extensões opcionais de configuração de formulários (cascade-dropdown, conditional-fields) — ver `forms/CLAUDE.md` |

O frontend descobre as extensões com `import.meta.glob`:

```ts
const entries = import.meta.glob('./*/{plugins,modules,tools}/*/index.tsx');
```

Cada entry é lazy-importado quando o slot/rota correspondente é montado, então o
bundle inicial não carrega tudo de uma vez.

## Convenções

- **Use o design system**: `@/components/ui/*` (Radix + shadcn) — não importe
  Radix direto. Para campos de tabela use `@/components/common/dynamic-table/*`
- **Hooks de API**: importe ou crie em `@/hooks/tanstack-query/`
- **Tipos**: `IExtension`, `IField`, `ITable`, etc. estão em `@/lib/interfaces`
- **Não adicione novas dependências sem alinhamento** — o bundle é compartilhado
- **Sem código secreto**: tudo aqui vai pro client

## Contrato dos slots (plugins)

Cada slot recebe props padronizadas — o componente da extensão é uma função
React que aceita esse contexto. Catálogo completo em
`backend/extensions/CLAUDE.md`.

```tsx
// Exemplo: frontend/extensions/marcos-pdf/plugins/export-pdf/index.tsx
import { Button } from '@/components/ui/button';
import type { ITable } from '@/lib/interfaces';

type Props = {
  table: ITable;
  selection: Array<string>;
};

export default function ExportPdfPlugin({ table, selection }: Props) {
  return <Button onClick={...}>Baixar PDF</Button>;
}
```

## Módulos

O componente default é montado como filho da rota dinâmica
`/_private/e/$package/$id/`. Recebe acesso a hooks normais (TanStack Query,
Router, Form, etc.).

## Ferramentas

Mesma ideia dos módulos, mas a rota é `/_private/tools/$package/$id/`. Aparece
no submenu Ferramentas da sidebar.

## Notificações in-app

Extensões geralmente **disparam** notificações pelo backend (via
`NotificationContractService` — ver `backend/extensions/CLAUDE.md`). No frontend
você só precisa **ler** notificações quando faz sentido para a UI da sua
extensão (ex.: badge custom, lista filtrada por `source.pkg`).

Hooks já existentes (não duplique):

```ts
import { useNotificationPaginated } from '@/hooks/tanstack-query/use-notification-paginated';
import { useNotificationUnreadCount } from '@/hooks/tanstack-query/use-notification-unread-count';
import { useNotificationMarkAsRead } from '@/hooks/tanstack-query/use-notification-mark-as-read';
```

O `NotificationBell` no header e a página `/notifications` cobrem o caso comum —
só implemente UI custom se precisar filtrar/agrupar por `source.pkg` da sua
extensão. Toast em tela é controlado por `user.notificationsEnabled` (toggle no
formulário do perfil) — respeite essa preferência.
