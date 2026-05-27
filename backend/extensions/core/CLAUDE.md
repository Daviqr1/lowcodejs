# Pacote `core`

Pacote de extensões shipado junto da plataforma. Reservado para funcionalidades
oficiais que adotam o modelo de extensão (ao invés de viver no core
"hard-coded").

## Estrutura atual

```
core/
├── plugins/
│   └── row-access/   ← Controle de Acesso a Linhas (visibility + creator + date)
├── modules/          ← (Fase 4)
└── tools/            ← (Fase 2) clone-table migra para cá
```

## Plugin `row-access`

Plugin único que consolida o que antes eram 3 plugins separados
(`visibility-by-role`, `creator-bypass`, `date-window-guard`). Implementa o
contrato `RowAccessGuard` com 3 módulos sempre configuráveis por tabela:

1. **Visibility por papel** — matriz `role × valor` (8 valores max). Anti-lockout
   força MASTER + ADMINISTRATOR em cada valor.
2. **Bypass do criador** — criadores sempre veem/editam/deletam suas rows.
3. **Janela temporal** — `off` (default), `createdAt-sliding`, `createdAt-fixed`
   ou `field-range`.

Detalhes completos em `plugins/row-access/README.md`.

## Bulk apply

Configuração em N tabelas ao mesmo tempo via endpoint
`PATCH /extensions/:id/bulk-table-settings` (use-case em
`application/resources/extensions/bulk-configure-table-settings/`). Frontend usa
o `<RowAccessConfigSheet>` com `TableMultiSelect`.

## Migration

`migrate-consolidate-row-access.ts` converte bindings dos 3 plugins antigos
em 1 binding do `row-access` no boot, preservando `tableScope` (união) e
`tableSettings` (merged por tableId). Idempotente via marker
`MIGRATION_ROW_ACCESS_CONSOLIDATION_AT`.
