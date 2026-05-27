# Extensions (backend)

Diretório canônico de extensões do LowCodeJS no backend. **Toda extensão é
declarada aqui** — o loader (`application/core/extensions/loader.ts`) varre
esta pasta no boot, valida cada `manifest.json` e faz upsert na collection
`extensions` do MongoDB. O frontend espelha apenas o código (`frontend/extensions/`),
mas a "fonte de verdade" para o registro no DB é este diretório.

## Tipos de extensão

| Tipo | Descrição | Exemplo | Onde aparece |
|------|-----------|---------|--------------|
| `PLUGIN` | Botão/widget pequeno injetado em um placeholder do core | "Exportar PDF", "Adicionar em lote" | Slot configurado no manifest (ex: `table.actions`) |
| `MODULE` | Tela/dashboard/formulário maior, com URL própria | Dashboard customizado, Homepage | URL default `/e/<pkg>/<id>` ou via Menu custom |
| `TOOL` | Utilitário do sistema, listado no submenu Ferramentas | Clonar tabela, Importar CSV | `/tools/<pkg>/<id>` + sublink na sidebar Ferramentas |

### Capability `kind` (plugins que mutam comportamento do core)

Plugins do tipo `PLUGIN` podem declarar `placement.kind` ao invés de
`placement.slot` quando não são UI mas **interceptam comportamento do core**.

| kind | Contrato | Onde fica registrado | Plugin de exemplo |
|------|----------|---------------------|-------------------|
| `row-access-guard` | `RowAccessGuard` (em `application/core/extensions/row-access-guard.contract.ts`) | `RowAccessGuardService.GUARDS` (map estático em `row-access-guard.service.ts`); registro feito pelo próprio módulo do plugin no module-load | `core/plugins/row-access` |

Row use-cases (paginated/show/create/update/delete) consultam o service via
`getActiveGuardsFor(tableId)` e aplicam os métodos do guard (`adjustListQuery`,
`canRead`, `canWrite`, `sanitizeWritePayload`) — para detalhes do contrato
ver o arquivo da interface.

Plugins desse `kind` precisam injetar suas próprias dependências de repos
no boot. Convenção: o plugin exporta `injectXxxGuardDeps(deps)` e o
`bin/server.ts` chama com `getInstanceByToken(...)` após o DI registry estar
pronto. Veja exemplo no `core/plugins/row-access`.

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
  "author": "Time Core",
  "icon": "FileDown",
  "placement": {
    "slot": "table.actions"
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
| `placement.slot` | string | apenas PLUGIN | id do slot do core (ver §Slots) |
| `route` | string | apenas MODULE | URL default; default = `/e/<pkg>/<id>` |
| `tool.submenu` | string | opcional TOOL | grupo dentro de Ferramentas |

Campos extras são preservados em `manifestSnapshot` (passthrough Zod) — útil
para configurações específicas da extensão.

## Slots de plugins (catálogo inicial — Fase 3)

Os slots ainda não estão renderizados (Fase 1 só registra). O catálogo final
viverá aqui:

| Slot id | Onde aparece | Context props |
|---------|--------------|---------------|
| `table.actions` | barra ao lado de "Adicionar registro" | `{ table, selection }` |
| `table.tools-menu` | menu de ferramentas no topo da grade | `{ table, view }` |
| `table.filters` | sidebar de filtros | `{ table, filters, setFilters }` |
| `table.row-menu` | menu de contexto de uma linha | `{ table, row }` |
| `table.bulk-actions` | barra de ações em massa | `{ table, selectedIds }` |
| `app.header.right` | header global | `{ user }` |
| `app.dashboard.widgets` | dashboard | `{}` |

A SKILL valida `placement.slot` contra esta lista.

## Ciclo de vida

1. **Build/deploy**: o código da extensão entra no bundle
2. **Boot**: `loadExtensions()` em `bin/server.ts` varre `extensions/`, valida
   manifestos via Zod, faz `upsert` na collection `extensions`, e marca como
   `available: false` qualquer registro cujo manifesto sumiu
3. **Ativação**: MASTER vai em `/extensions`, liga o switch — grava
   `enabled: true` no DB
4. **Runtime (futuro)**: hooks de slot/menu consultam o registry e lazy-importam
   o entry da extensão

## Permissões

- **Listar/ativar/configurar**: apenas role `MASTER` (via `RoleMiddleware`)
- **Rotas registradas pela extensão**: a extensão escolhe seus middlewares
  (Auth, RoleMiddleware, etc.). Para garantir que uma rota só responda quando
  ativa, use `ExtensionActiveMiddleware({ pkg, type, extensionId })`

## Convenções

- **Sem sandbox**: extensões rodam com privilégios totais — o desenvolvedor
  assume o risco. Use os repos via `getInstanceByToken` ou `@Inject`, igual ao
  core
- **Either pattern**: use-cases retornam `Either<HTTPException, T>`
- **Mensagens em PT-BR**
- **Design system obrigatório no frontend**: importe de `@/components/ui/*`
- O pacote especial `core` é shipado junto da plataforma (Fase 2 migra o
  Clonar Tabela para `core/tools/clone-table/`)

## Como criar uma nova extensão

Use a SKILL `lowcodejs-extension` (Fase 5 do roadmap). Manualmente:

1. Crie `backend/extensions/<pkg>/<type>/<id>/manifest.json`
2. Se houver código backend, adicione `controller.ts` + `use-case.ts` no mesmo
   diretório
3. Se houver código frontend, crie `frontend/extensions/<pkg>/<type>/<id>/index.tsx`
4. Reinicie o backend → o loader registra no DB → ative em `/extensions`
