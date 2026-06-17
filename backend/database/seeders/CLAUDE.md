# Seeders — Dados Iniciais do Banco

Scripts de seed para popular o MongoDB com permissões, grupos e Setting
singleton. Executados via `npm run seed` (em `docker exec`).

O usuário MASTER **não** é criado por seed — é criado pelo Setup Wizard
na primeira execução da UI.

## Arquivos

| Arquivo                           | Descrição                                                                   |
| --------------------------------- | --------------------------------------------------------------------------- |
| `main.ts`                         | Orquestrador: glob nos `*.seed.(ts|js)`, valida padrão de filename, ordena e executa sequencialmente. Em falha: log + `process.exit(1)` + `mongoose.disconnect()` |
| `1720448435-permissions.seed.ts`  | Cria 12 registros de permissão (CREATE_TABLE, VIEW_TABLE, etc.). Upsert por `slug` com `$set` |
| `1720448445-user-group.seed.ts`   | Cria 4 grupos: MASTER, ADMINISTRATOR, MANAGER, REGISTERED. Metadados via `$set`; array `permissions` via `$setOnInsert` (preserva customizações após a 1ª criação). Busca apenas permissões com `trashed: false` |
| `1720465893-settings.seed.ts`     | Setting singleton. Se já existe MASTER, marca `SETUP_COMPLETED=true`. Caso contrário, usa `$setOnInsert: {}` (não sobrescreve configs existentes) |
| `1778025600-demo-users.seed.ts`   | **Gated por `DEMO_MODE=true`**. Cria/atualiza 2 usuários públicos (`admin@admin.com` → ADMINISTRATOR, `registered@registered.com` → REGISTERED) com `$set` em todos os campos (incluindo password re-hashado a cada execução). Throw se grupos ausentes. No-op silencioso quando `DEMO_MODE=false` |

## Seeds de desenvolvimento (`dev/`)

Não são descobertos pelo `main.ts` (nome não termina em `.seed.ts`) nem rodam no
boot. Servem apenas para popular dados de teste localmente.

| Arquivo                  | Comando                  | Descrição                                                                                          |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `dev/seed-test-users.ts` | `npm run seed:test-users`| Cria N usuários `*@demo.com` (default 25, `-- --count=N`), status/grupos variados, senha `Teste@123`. Idempotente: recria os `*@demo.com` a cada execução |

## Padrões

- **Idempotência**: usa upsert (`bulkWrite`/`findOneAndUpdate` com `upsert: true`)
  para executar múltiplas vezes sem duplicar dados. `_id` é preservado quando o
  filter encontra documento.
- **Sobrescrita controlada**: metadados do código usam `$set` (code é fonte da
  verdade). Dados customizáveis pelo usuário (ex.: array de permissions do grupo)
  usam `$setOnInsert` para preservar ajustes manuais.
- **Ordenação por timestamp**: prefixo numérico no nome do arquivo define a ordem
  de execução. Filenames fora do padrão `\d{10,}-<nome>.seed.(ts|js)` fazem o
  orquestrador abortar antes de rodar qualquer seeder.
- **Fail-fast**: cada seeder roda dentro de `try/catch` no `main.ts`. Qualquer erro
  propaga com log do arquivo que falhou, `process.exit(1)` e `mongoose.disconnect()`.
- **Gating por env**: seeders sensíveis a ambiente (ex.: `1778025600-demo-users.seed.ts`)
  fazem early-return baseado em `Env` (`DEMO_MODE`). Seed continua sendo idempotente
  e seguro de rodar em qualquer instância — só dispara o efeito quando a flag estiver ligada.
