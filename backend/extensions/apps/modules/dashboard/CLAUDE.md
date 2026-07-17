# Dashboard (extensão `apps/modules/dashboard`)

Módulo que substitui (sem remover) o `/dashboard` estático do core, agora
exibindo **dados reais** calculados a partir das tabelas e usuários do sistema.

## Acesso UI

`/e/apps/dashboard` (URL canônica) — roles MASTER ou ADMINISTRATOR. A rota antiga
`/dashboard` continua existindo paralelamente até decisão do gerente.

## Endpoint próprio

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/e/apps/dashboard/stats` | GET | Retorna agregados (totais, gráfico mensal de tabelas criadas, usuários por status, atividade recente) |

Middlewares:
1. `AuthenticationMiddleware({ optional: false })`
2. `RoleMiddleware([E_ROLE.MASTER, E_ROLE.ADMINISTRATOR])`
3. `ExtensionActiveMiddleware({ pkg: 'apps', type: MODULE, extensionId: 'dashboard' })`

## Dados retornados

```ts
{
  totals: { tables, users, records, activeUsers },
  tablesPerMonth: [{ month: 'Jan' | 'Fev' | ..., tables: number }],   // últimos 6 meses
  usersByStatus: [{ status: 'Ativos' | 'Inativos', value, fill }],
  recentActivity: [{ id, type: 'table_created' | 'user_created', description, time: ISO }]
}
```

## Cálculo

- **Totais**: `tableRepository.findMany({})` + `userRepository.findMany({})`
- **records**: para cada tabela ativa, `getDataConnection().collection(slug).countDocuments({ trashedAt: null })` em paralelo via `Promise.all` (exclui rows na lixeira; rascunhos contam). Tabelas sem collection ainda retornam 0
- **tablesPerMonth**: agrupa `tables.createdAt` por mês nos últimos 6 meses, label em PT-BR
- **usersByStatus**: 2 entradas (ativos/inativos) com `var(--chart-1/2)` para cor consistente com tema
- **recentActivity**: top 5 tabelas + top 5 usuários por `createdAt` desc, mesclados e cortados em 10

## Erros

| Code | Cause | Quando |
|------|-------|--------|
| 401 | UNAUTHORIZED | Sem auth |
| 403 | FORBIDDEN | Role diferente de MASTER ou ADMINISTRATOR |
| 404 | EXTENSION_NOT_ACTIVE | Extensão desativada |
| 500 | DASHBOARD_STATS_ERROR | Erro interno na agregação |
