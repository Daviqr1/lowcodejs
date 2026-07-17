# Table Sandbox (VM de Scripts)

Sistema de sandbox para execucao segura de scripts de usuario (beforeSave, afterSave, onLoad).

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `handler.ts` | Ponto de entrada principal. Orquestra: monta sandbox, executa, coleta logs. Exporta `executeScript()` e `HandlerFunctionAsync()` (compatibilidade) |
| `executor.ts` | Executa codigo em Node `vm.Script` com timeout. Valida sintaxe sem executar via `validateSyntax()` |
| `sandbox.ts` | Monta ambiente isolado (SandboxGlobals) com todas as APIs e builtins permitidos |
| `field-resolver.ts` | Resolve valores de campo com normalizacao de slug (hifen/underscore). Converte tipos automaticamente |
| `types.ts` | Tipos TypeScript: ExecutionResult, ExecutionContext, FieldDefinition, APIs (Field, Context, Email, Utils) |

## Seguranca e Isolamento

- Execucao via `vm.createContext()` + `vm.Script` (Node VM isolada)
- **Timeout**: 5 segundos (DEFAULT_TIMEOUT)
- **Bloqueado**: require, fs, network, process, global - nenhum acesso a globals do Node
- **Permitido**: JSON, Date, Math, Number, String, Boolean, Array, Object, RegExp, Map, Set, Promise, Error, encode/decodeURI(Component)
- Codigo deve estar em formato IIFE: `(async () => { ... })()`
- Promises executadas com `Promise.race` contra timeout
- `breakOnSigint: true` para interrupcao via Ctrl+C

## APIs Expostas ao Script

| API | Metodos | Descricao |
|-----|---------|-----------|
| `field` | `get(slug)`, `set(slug, value)`, `getAll()`, `getLabel(slug, value?)` | Leitura/escrita de campos do registro (getLabel resolve label de DROPDOWN) |
| `context` | `action`, `moment`, `userId`, `isNew`, `appUrl`, `table`, `reentrant`, `previous` | Contexto de execucao (read-only, Object.freeze) |
| `email` | `send(to[], subject, body)`, `sendTemplate(to[], subject, message, data?)` | Envio de email via Nodemailer |
| `users` | `resolve(ids)`, `emails(ids)` | Resolve ids de campos USER/CREATOR (string, ObjectId, objeto populado ou arrays/nested) em `{ _id, name, email }`. Roda no host com acesso ao model User (conexao system) |
| `notify` | `send({ userIds, title, body?, action?, source?, type?, actorUserId? })` | Cria notificacoes in-app (uma por usuario) + emite via socket `/notifications`. `actorUserId` (default `context.userId`) e excluido dos destinatarios |
| `utils` | `today()`, `now()`, `formatDate(date, format?)`, `sha256(text)`, `uuid()` | Utilitarios de data, crypto, UUID |
| `console` | `log()`, `warn()`, `error()` | Logs interceptados e retornados no resultado |

## Context Values

| Campo | Valores |
|-------|---------|
| `action` | `novo_registro`, `editar_registro`, `excluir_registro`, `carregamento_formulario` |
| `moment` | `carregamento_formulario`, `antes_salvar`, `depois_salvar` |
| `reentrant` | `true` quando o script roda pelo hook `pre/post('save')` do Mongoose (model-builder), `false` quando roda pelo use-case do controller. **No create o beforeSave roda 2x** (use-case + hook); scripts com efeitos colaterais (email/notificacao) devem usar este flag para nao duplicar |
| `previous` | Registro ANTES do save (apenas em update via use-case) ou `null` (create). Permite comparar valor anterior x novo |

## Efeitos colaterais em beforeSave (email/notificacao)

`afterSave` roda como `post('save')` e **nao dispara em update** (update usa
`findOneAndUpdate`). Para enviar email/notificacao em create E update, use
`beforeSave` + as APIs `users`/`notify`, respeitando:

- **Dedup do create**: `if (context.isNew && !context.reentrant) return;` faz o
  efeito rodar so no passe de hook (onde o `_id` ja existe, para o link).
- **Evitar spam**: `if (!context.isNew && context.reentrant) return;` ignora
  saves vindos de hook em update (reacoes, itens de grupo), agindo so no passe
  do controller.
- **Nao bloquear o save**: dispare `email.sendTemplate(...)` e `notify.send(...)`
  **sem `await`** (fire-and-forget) — o SMTP lento nao deve estourar o timeout
  de 5s do beforeSave e travar a gravacao. Ambas as APIs capturam erros
  internamente (nunca lancam).

Exemplo completo de referencia: `_docs/chamados/beforeSave.js`.

## Retorno (ExecutionResult)

```typescript
{ success: boolean, error?: ExecutionError, logs: string[] }
```

Tipos de erro: `syntax`, `runtime`, `timeout`, `unknown` (com line/column quando disponivel)

## Field Resolver

- `normalizeSlug(slug)` - converte hifens para underscores
- `resolveFieldValue(doc, slug)` - tenta slug original, normalizado e com hifens
- `convertValue(value)` - converte strings para Number, Boolean ou Date automaticamente
