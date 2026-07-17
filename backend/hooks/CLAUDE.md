# hooks — Hooks de Ciclo de Vida Fastify

Hooks globais registrados no kernel (`start/kernel.ts`) via `kernel.addHook`.
Cobrem três pontos do ciclo de vida do Fastify: `onReady` (uma vez, no boot),
`onRequest` (antes do roteamento de cada request) e `onResponse` (depois da
resposta enviada).

## Arquivos

| Arquivo | Hook (export) | Quando roda | O que faz |
| ------- | ------------- | ----------- | --------- |
| `load-extensions.hook.ts` | `LoadExtensionHook` | `onReady` (boot) | Resolve `ExtensionMongooseRepository` via `getInstanceByToken` e chama `loadExtensions()` — varre `extensions/`, valida manifests e faz upsert na collection `extensions`. Erros são logados, nunca propagados |
| `content-disposition.hook.ts` | `StorageContentDispositionHook` | `onRequest` (request) | Intercepta `GET`/`HEAD` em `/storage/*`. Resolve `content-disposition` (inline vs `?download=1` → attachment), serve o arquivo do driver indicado em `doc.location` com **dual-read fallback** (local↔s3), define cache-control (immutable p/ hash names, no-cache p/ estáticos) e ETag |
| `logger.hook.ts` | `LoggerUserActionHook` | `onResponse` (request) | Persiste log de auditoria da ação do usuário via `LoggerMongooseRepository`. Mapeia método→ação (POST=CREATE, etc.) e rota→objeto (ROW, FIELD, TABLE...). Captura body/query/params em `content` |

## Fluxo

Ordem de registro no `kernel.ts`:

1. `onResponse` → `LoggerUserActionHook`
2. `onRequest` → `StorageContentDispositionHook`
3. `onReady` → `LoadExtensionHook`

O `onReady` dispara uma vez quando todos os plugins estão prontos. `onRequest`
e `onResponse` rodam a cada request — `onRequest` antes do handler (e pode
encerrar a resposta de storage ali mesmo), `onResponse` após o envio (não
bloqueia o cliente).

## Convenções

- Hooks resolvem dependências por `getInstanceByToken<Contract>(Impl)` — não
  são classes `@Service` e não usam constructor injection.
- Toda mensagem ao usuário é em PT-BR; logs internos podem ser técnicos.
- Falhas são **engolidas** (try/catch + `console.error`): um hook nunca deve
  derrubar a requisição nem o boot.

## Gotchas

- **Logger não loga tudo**: ignora GETs (VIEW), requests sem usuário
  autenticado (SSR/públicos/healthcheck) e requests com header `X-Skip-Log`
  (ex: reordenação kanban). Sem isso o histórico viraria ruído.
- **OBJECT_MAP é ordenado**: rotas aninhadas (`/groups`, `/fields`, `/rows`)
  vêm antes de `/tables` para que `/tables/:slug/rows/:id/groups/...` resolva
  para `GROUP_ROW`, não `TABLE`. Mantenha a ordem ao adicionar entradas.
- **content-disposition rejeita path traversal**: bloqueia filenames com `..`
  ou `/`. Hash names (`^\d{1,8}$`) viram immutable; o resto é tratado como
  estático com revalidação.
- **dual-read**: quando o doc Storage não existe no Mongo (legado ou upload em
  corrida), o fallback assume `local` como driver histórico.
