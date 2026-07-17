# Chamados — Notificações (email + in-app)

Implementação da regra: **Chamados** notifica Atendente, Acompanhamento e quem
criou ao **criar e alterar** o registro; **Mensagens** dos chamados notificam
todos esses + os usuários em **Informar** quando uma mensagem nova é adicionada.
Tudo via **email** e **notificação in-app**.

## Como aplicar

1. Abra a tabela **Chamados** → Configurações → Métodos → **beforeSave**.
2. Cole o conteúdo de [`beforeSave.js`](./beforeSave.js).
3. Salve.

Não é `afterSave` porque o `afterSave` (hook `post('save')`) **não dispara em
update** — o update usa `findOneAndUpdate`, que pula os document middlewares do
Mongoose. `beforeSave` roda no create **e** no update.

## Capacidades de sandbox adicionadas (core)

O script usa o `email.send`/`sendTemplate` (já existente) mais duas APIs novas
expostas a todos os scripts low-code, e dois campos de contexto. Implementadas
em `backend/application/core/table/` (branch `feat-improve-beforeSave`):

| API / campo          | O que faz                                                            |
| -------------------- | ------------------------------------------------------------------- |
| `users.resolve(ids)` | Resolve ids de campos USER/CREATOR em `{ _id, name, email }`         |
| `users.emails(ids)`  | Atalho: só os emails válidos e únicos                                |
| `notify.send({...})` | Cria notificações in-app (uma por usuário) + emite via socket        |
| `context.reentrant`  | `true` no passe de hook do Mongoose; `false` no passe do use-case    |
| `context.previous`   | Registro antes do save (update) ou `null` (create) — para diffs      |

Documentação canônica: `backend/application/core/table/CLAUDE.md`.

## Decisões e limitações

- **Dedup do create:** no create o `beforeSave` roda 2× (use-case do controller
  + hook `pre('save')`). O script age **só no passe de hook**
  (`context.reentrant === true`), onde o `_id` já existe para montar o link.
- **Sem spam:** em update o script age só no passe do controller
  (`context.reentrant === false`); saves vindos de hook (reações, itens de
  grupo) são ignorados.
- **Mensagens novas** são detectadas por contagem (`context.previous.mensagens`
  vs atual) — assume que mensagens são **append-only** no formulário. Editar/
  remover mensagens antigas não dispara notificação.
- **Email não bloqueia o save:** `email.sendTemplate(...)` e `notify.send(...)`
  são disparados **sem `await`** (fire-and-forget), para um SMTP lento não
  estourar o timeout de 5s do beforeSave.
- **Re-notificação em edições:** qualquer update do chamado reenvia o email de
  nível-chamado para todos os envolvidos (comportamento aceito no requisito).
- **Mensagens adicionadas via endpoint de grupo** (`/rows/:id/groups/...`,
  `addGroupItem`) passam só pelo hook `pre('save')` → são ignoradas pela guarda
  anti-spam. A notificação de mensagem funciona quando o chamado é salvo pelo
  **formulário completo (PUT update)**, que é o fluxo padrão do grupo Mensagens
  exibido no formulário.
