# Plugin: Visibilidade por Papel

Filtra registros de tabelas vinculadas conforme o role do usuário logado:

| Role | Vê registros Públicos | Vê registros Sigilosos |
|------|----------------------|------------------------|
| MASTER | ✓ | ✓ |
| ADMINISTRATOR | ✓ | ✓ |
| MANAGER | ✓ | ✗ |
| REGISTERED | ✓ | ✗ |

## Como ativar

1. Como MASTER, abra `/extensions`
2. Ligue o toggle "Visibilidade por Papel"
3. Clique "Configurar" e selecione as tabelas onde o plugin deve atuar
4. Salvar — o plugin:
   - Cria automaticamente o field `Visibilidade` (DROPDOWN) em cada tabela escolhida
   - Marca todas as rows existentes como `Público` (backfill)

## Comportamento por operação

| Operação | MASTER/ADMIN | MANAGER/REGISTERED |
|----------|--------------|---------------------|
| Listar rows | Vê tudo | Lista filtrada por `visibility=PUBLIC` |
| GET row Sigilosa por ID | 200 OK | **403 ROW_ACCESS_DENIED** |
| GET row Pública por ID | 200 OK | 200 OK |
| Criar com `visibility=SIGILOSO` | OK | **403 ROW_WRITE_RESTRICTED** |
| Criar sem `visibility` no payload | OK (default null) | Forçado para `PUBLIC` |
| Atualizar row Pública mantendo PUBLIC | OK | OK (visibility preservado) |
| Atualizar row Pública pra SIGILOSO | OK | **403 ROW_WRITE_RESTRICTED** |
| Atualizar row Sigilosa | OK | **403 ROW_ACCESS_DENIED** (canRead falha) |
| Deletar row Sigilosa | OK | **403 ROW_ACCESS_DENIED** |

## Restrições do plugin

- **Modo "Todas as tabelas" não é suportado** (`supportsScopeAll: false`). A UI desabilita o radio com tooltip.
- **Slug do field é fixo** (`visibility`) — se a tabela já tiver um field com esse slug que não seja DROPDOWN com opções `PUBLIC`/`SIGILOSO`, o bind falha com **409 PLUGIN_BIND_CONFLICT** e o scope não é alterado.

## Desativar / desvincular

- **Tirar tabela do scope** (via Workshop): filtro deixa de aplicar, field `Visibilidade` PERMANECE como dropdown comum na tabela. Dados nas rows continuam intactos. Reversível: religar restaura o filtro.
- **Toggle off do plugin**: mesma coisa — filtro suspenso em todas as tabelas do scope; field e dados preservados.

## Arquitetura (sumário)

- **Manifest:** `manifest.json` declara `placement.kind: "row-access-guard"`
- **Implementação:** `guard.ts` exporta `VisibilityByRoleGuard` que implementa o contrato `RowAccessGuard` (em `backend/application/core/extensions/row-access-guard.contract.ts`)
- **Registro:** O guard é registrado no map estático `RowAccessGuardService.GUARDS` (em `row-access-guard.service.ts`) pela chave `core:visibility-by-role`
- **Injeção de deps:** No boot (`bin/server.ts`), o guard recebe `fieldRepo`, `tableRepo` e `rowRepo` via `injectVisibilityByRoleGuardDeps(...)`
- **Consumo:** Row use-cases (paginated, show, create, update, delete) consultam `RowAccessGuardService.getActiveGuardsFor(tableId)` e aplicam os métodos do guard

Spec completa: `docs/superpowers/specs/2026-05-20-plugin-visibility-by-role-design.md`
Plano de implementação: `docs/superpowers/plans/2026-05-20-plugin-visibility-by-role-plan.md`

## Performance

Migration `migrate-add-visibility-index.ts` cria índice `{ visibility: 1 }` em cada coleção dinâmica das tabelas no scope. Roda automaticamente no boot do container (idempotente via marker `MIGRATION_VISIBILITY_INDEX_AT` no Setting singleton).

Para forçar re-criação: `npm run migrate:visibility-index -- --force`
