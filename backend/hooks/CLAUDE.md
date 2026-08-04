# hooks — Hooks de Ciclo de Vida Fastify

Hooks globais do kernel. Cada um e um par **contract + impl `@Service()`**,
registrado pelo scanner do `di-registry.ts` — `hooks/` e um dos roots varridos.
O `start/kernel.ts` resolve cada service do container e registra o metodo
`handle` no ponto de ciclo de vida correspondente.

## Arquivos

| Service | Hook | Quando roda | O que faz |
|---------|------|-------------|-----------|
| `LoadExtensionsHookService` | `onReady` | uma vez, no boot | Varre `extensions/`, valida manifests e faz upsert na collection. Falha e nao-fatal, so loga |
| `ContentDispositionHookService` | `onRequest` | rotas `/storage/*` | Resolve o metadado do arquivo, monta o `Content-Disposition` e serve o binario pelo driver de `doc.location`, com fallback cruzado |
| `LoggerHookService` | `onResponse` | toda request | Registra a acao do usuario no historico, com a auditoria da ROW referenciada |
| `ErrorLogHookService` | `onSend` | respostas >= 400 | Grava no "Historico de erros". Captura tambem os erros que os use-cases devolvem via Either — esses nao sao lancados, entao nao passam pelo error handler |

## Ordem no kernel

`ContentDispositionHookService` e registrado **antes** de
`await registerDependencies()`? Nao — todos sao registrados **depois**. Resolver
um service antes disso devolve `undefined` silenciosamente; foi o
`npm run boot:check` que pegou essa inversao durante o refactor.

## Notas

- `401` e excluido de proposito do historico de erros: dispara em massa (sessao
  expirada, logout, SSR, retry de refresh-token) e polui sem indicar defeito.
- So erros de usuario **autenticado** entram — request anonimo e ruido.
