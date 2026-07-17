# Extensions (backend)

Diretório canônico de extensões do LowCodeJS no backend. **Toda extensão é
declarada aqui** — o loader (`application/core/extensions/loader.ts`) varre
esta pasta no boot, valida cada `manifest.json` e faz upsert na collection
`extensions` do MongoDB. O frontend espelha apenas o código (`frontend/extensions/`),
mas a "fonte de verdade" para o registro no DB é este diretório.

## Pacotes

| Pacote | Ativação | CLAUDE.md | Conteúdo |
|--------|----------|-----------|----------|
| `core` | auto-ativado no boot (exceção de ativação) | `core/CLAUDE.md` | tools/plugins/modules shipados com a plataforma |
| `apps` | opcional (começa desativado) | `apps/CLAUDE.md` | extensões oficiais opcionais (ex: dashboard) |
| `forms` | opcional (começa desativado) | `forms/CLAUDE.md` | plugins que enriquecem os formulários das tabelas |

## Tipos de extensão

| Tipo | Descrição | Exemplo | Onde aparece |
|------|-----------|---------|--------------|
| `PLUGIN` | Botão/widget pequeno injetado em um placeholder do core | "Exportar PDF", "Adicionar em lote" | Slot configurado no manifest (ex: `table.actions`) |
| `MODULE` | Tela/dashboard/formulário maior, com URL própria | Dashboard customizado, Homepage | URL default `/e/<pkg>/<id>` ou via Menu custom |
| `TOOL` | Utilitário do sistema, listado no submenu Ferramentas | Clonar tabela, Importar CSV | `/tools/<pkg>/<id>` + sublink na sidebar Ferramentas |

## Estrutura de pastas

```
backend/extensions/
└── <pkg>/                              ← nome do pacote (slug, ex: "core")
    ├── manifest.json                   ← (opcional) metadados do pacote
    ├── CLAUDE.md
    ├── plugins/
    │   └── <id>/
    │       ├── manifest.json           ← obrigatório (tipo=plugin)
    │       ├── controller.ts           ← opcional, se o plugin chamar API
    │       └── use-case.ts
    ├── modules/
    │   └── <id>/
    │       ├── manifest.json           ← obrigatório (tipo=module)
    │       └── controller.ts           ← opcional
    └── tools/
        └── <id>/
            ├── manifest.json           ← obrigatório (tipo=tool)
            └── controller.ts           ← opcional
```

A chave única no DB é o trio `(pkg, type, extensionId)`:

- `pkg` é o nome da pasta direto sob `extensions/`
- `type` é derivado da pasta intermediária (`plugins` → `PLUGIN`, etc.)
- `extensionId` é o nome da pasta da extensão **e** deve bater com `manifest.id`

## `manifest.json`

Schema Zod canônico em `backend/application/core/extensions/manifest.schema.ts`.
Um manifesto mínimo para um plugin:

```json
{
  "id": "export-pdf",
  "type": "PLUGIN",
  "name": "Exportar PDF",
  "description": "Baixa a tabela atual em PDF",
  "version": "1.0.0",
  "author": "LowcodeJS",
  "icon": "FileDown",
  "placement": {
    "slots": ["table.actions"]
  },
  "requires": {
    "lowcodejs": ">=1.0.0"
  }
}
```

Para `MODULE`:

```json
{
  "id": "homepage",
  "type": "MODULE",
  "name": "Homepage",
  "version": "1.0.0",
  "route": "/e/core/homepage",
  "icon": "HomeIcon"
}
```

Para `TOOL`:

```json
{
  "id": "clone-table",
  "type": "TOOL",
  "name": "Clonar Tabela",
  "version": "1.0.0",
  "icon": "CopyIcon",
  "tool": {
    "submenu": "tables"
  }
}
```

### Campos comuns

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| `id` | string slug | sim | deve bater com o nome da pasta |
| `type` | `PLUGIN \| MODULE \| TOOL` | sim | redundante com a pasta, validado |
| `name` | string | sim | label exibido na UI |
| `description` | string \| null | não | exibido no Workshop |
| `version` | string | sim | semver |
| `author` | string \| null | não | |
| `icon` | string \| null | não | nome lucide-react ou path relativo |
| `image` | string \| null | não | preview/screenshot |
| `requires.lowcodejs` | string semver | não | versão mínima da plataforma |
| `requires.extensions` | string[] | não | outras extensões necessárias |
| `permissions.view` | array de roles | não | roles permitidas. Vazio = todos auth users |
| `placement.slots` | string[] | apenas PLUGIN | um ou mais ids de slots do core onde o plugin será renderizado (ver §Slots) |
| `route` | string | apenas MODULE | URL default; default = `/e/<pkg>/<id>` |
| `tool.submenu` | string | opcional TOOL | grupo dentro de Ferramentas |

Campos extras são preservados em `manifestSnapshot` (passthrough Zod) — útil
para configurações específicas da extensão.

### Permissões (`permissions.view`)

Quando um manifest declara `permissions.view: ['MASTER', 'ADMINISTRATOR']`, o
endpoint `GET /extensions/active` filtra a extensão para que **apenas** users
com essas roles vejam (sidebar não inclui, slots não rendem, módulos
inacessíveis). Vazio ou ausente = qualquer auth user vê. O endpoint
`/extensions` (MASTER-only) sempre retorna a lista completa para gestão no
Workshop.

## Módulos (type=MODULE)

Módulos são extensões maiores — telas, dashboards, formulários customizados.
Cada módulo tem URL default `/e/<pkg>/<id>` (resolvida pela rota dinâmica
`routes/_private/e/$package/$id/`). Para apresentar um módulo no menu lateral,
o MASTER cria um item de menu do tipo `EXTENSION_MODULE` em `/menus/create`,
selecionando o módulo desejado. A URL do menu é setada automaticamente para
`/e/<pkg>/<id>` no backend.

> **Nota Fase 4**: URLs custom (ex: `/home`) ainda não são suportadas. O menu
> sempre aponta para a URL canônica do módulo. URLs aliases ficam para Fase 6
> (requer splat-route com resolução em runtime).

## Slots de plugins

Slots são pontos no JSX do core onde plugins são injetados via
`<ExtensionSlot id="...">` (ver
`frontend/src/components/common/extension-slot/CLAUDE.md`). Catálogo atual:

| Slot id | Onde aparece | Context props | Status |
|---------|--------------|---------------|--------|
| `table.actions` | toolbar da página da tabela (linha do view/config) | `{ table, slug }` | instalado |
| `table.filters` | topo da listagem do FilterSidebar | `{ table, fields }` | instalado |
| `table.row.actions` | dropdown de ações por registro (`TableRowActionsMenu`) | `{ table, row, slug }` | instalado |
| `table.row.create` | topo do formulário de criação de registro | `{ table: ITable, slug: string, onFillFields: (data: Record<string, string \| null>) => void }` | instalado |
| `tables-page.actions` | toolbar de `/tables` (página de listagem de tabelas) | `{}` | reservado (futuro) |
| `tables-page.row.actions` | dropdown de ações de cada tabela em `/tables` | `{ table, slug }` | reservado (futuro) |
| `table.bulk-actions` | barra de ações em massa | `{ table, selectedIds }` | reservado (futuro) |
| `app.header.right` | header global | `{ user }` | reservado (futuro) |
| `app.dashboard.widgets` | dashboard | `{}` | reservado (futuro) |

> Plugins podem ser registrados em **vários** slots ao mesmo tempo declarando
> múltiplos ids em `placement.slots`. O entry React é montado uma vez por slot
> e recebe o context daquele slot.

Slots reservados podem ser instalados conforme demanda. A SKILL (Fase 5)
valida `placement.slots` contra os slots ativos.

> Extensões podem registrar **slots adicionais** fora deste catálogo. O pacote
> `forms` provê `table.fields.manage` (plugin `conditional-fields`) e
> `table.field.relationship.config` (plugin `cascade-dropdown`) — ver
> `backend/extensions/forms/CLAUDE.md`.

## Ciclo de vida

1. **Build/deploy**: o código da extensão entra no bundle
2. **Boot**: `loadExtensions()` em `bin/server.ts` varre `extensions/`, valida
   manifestos via Zod, faz `upsert` na collection `extensions`, e marca como
   `available: false` qualquer registro cujo manifesto sumiu
3. **Ativação**: MASTER vai em `/extensions`, liga o switch — grava
   `enabled: true` no DB
4. **Runtime**: o controller da extensão usa `ExtensionActiveMiddleware` para
   responder 404 quando desativada. O frontend usa `loadExtensionEntry` (Vite
   `import.meta.glob`) para lazy-importar entries de tools/modules/plugins

## Pacote `core` — exceção de ativação

O pacote especial `pkg === 'core'` é shipado junto com a plataforma. Para
não quebrar funcionalidades existentes que migraram do core para extensão
(ex: `clone-table`), o loader chama `upsert` com `enabledOnInsert: true`
**apenas** quando o registro é criado pela primeira vez. Toggles subsequentes
do MASTER são preservados — uma vez desligada, fica desligada.

## Permissões

- **Listar/ativar/configurar**: apenas role `MASTER` (via `RoleMiddleware`)
- **Rotas registradas pela extensão**: a extensão escolhe seus middlewares
  (Auth, RoleMiddleware, etc.). Para garantir que uma rota só responda quando
  ativa, use `ExtensionActiveMiddleware({ pkg, type, extensionId })`

## Convenções

- **Sem sandbox**: extensões rodam com privilégios totais — o desenvolvedor
  assume o risco. Acesse repos/services via `getInstanceByToken` (controllers de
  extensão não são `@Service`) ou, em classes `@Service`, por constructor
  injection — igual ao core. Não use `@Inject`.
- **Either pattern**: use-cases retornam `Either<HTTPException, T>`
- **Mensagens em PT-BR**
- **Design system obrigatório no frontend**: importe de `@/components/ui/*`
- O pacote especial `core` é shipado junto da plataforma (Fase 2 migra o
  Clonar Tabela para `core/tools/clone-table/`)

## Notificações in-app

Extensões podem disparar notificações em tempo real para um ou mais usuários
reusando o `NotificationContractService` do core (mesmo serviço usado por
forum-mention, kanban-comment-mention e atribuição de membros em
KANBAN/CALENDAR). Persiste no Mongo e emite via Socket.IO `/notifications`.

```ts
import { Service } from 'fastify-decorators';

import { E_NOTIFICATION_TYPE } from '@application/core/entity.core';
import { NotificationContractService } from '@application/services/notification/notification-contract.service';

@Service()
export default class MeuUseCase {
  constructor(
    private readonly notificationService: NotificationContractService,
  ) {}

  async run(actorUserId: string, recipientIds: string[]): Promise<void> {
    await this.notificationService.notify({
      userIds: recipientIds,
      type: E_NOTIFICATION_TYPE.GENERIC,   // ou um novo type que você definir
      title: 'Algo aconteceu',
      body: 'Detalhe opcional',
      action: {                            // opcional
        type: 'route',                     // 'route' | 'url'
        href: '/tables/clientes',
        label: 'Abrir',
      },
      source: {                            // opcional, metadados
        pkg: 'meu-pacote',
        tableSlug: 'clientes',
        rowId: '...',
        anchorId: '...',
      },
      actorUserId,                         // exclui o ator da lista
    });
  }
}
```

- `userIds` é deduplicado e o `actorUserId` é filtrado fora.
- Erros são logados e não propagados — disparo é fire-and-forget.
- Para um novo `type`, acrescente em `E_NOTIFICATION_TYPE` (core) **e** no enum
  do model (`notification.model.ts`).
- O frontend cuida do toast e do sininho — sua extensão só precisa disparar.

Documentação completa de payload, deep-link com anchor e tipos: ver
`.claude/skills/lowcodejs-extension/references.md` § Notificações.

## Como criar uma nova extensão

**Recomendado**: invoque a skill `lowcodejs-extension` (em
`.claude/skills/lowcodejs-extension/SKILL.md`). Ela orienta você desde a
decisão (PLUGIN/MODULE/TOOL) até o smoke test, com templates prontos para
copiar e checklist de validação.

**Gerador de boilerplate** (`npm run make:extension`, na raiz do monorepo):
cria o esqueleto dos dois lados (manifest + entry React + CLAUDE.md da
extensão; e, para TOOL ou com `--with-backend`, também
`controller/use-case/validator/schema`). Funciona interativo ou via flags:

```bash
# interativo (faz as perguntas)
npm run make:extension

# direto via flags
npm run make:extension -- --type plugin --pkg core --id hello-table \
  --name "Hello Table" --slots table.actions --icon HandIcon
npm run make:extension -- --type tool --pkg core --id merge-tables --with-backend
```

A saída já vem formatada (Prettier) e tipada; ao final imprime a linha pronta
para colar na tabela do CLAUDE.md do pacote e os próximos passos (restart +
ativar em `/extensions`). Script: `scripts/make-extension.mjs`.

Manualmente (sem o gerador):

1. Crie `backend/extensions/<pkg>/<type>/<id>/manifest.json`
2. Se houver código backend, adicione `controller.ts` + `use-case.ts` no mesmo
   diretório
3. Se houver código frontend, crie `frontend/extensions/<pkg>/<type>/<id>/index.tsx`
4. Reinicie o backend → o loader registra no DB → ative em `/extensions`
