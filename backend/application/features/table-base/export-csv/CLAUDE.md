# Export Tables CSV

Exporta a metadata das tabelas que casam com os filtros, em CSV. Cap 500.000 linhas.

## Endpoint
`GET /tables/exports/csv` | Auth: Sim | Permission: VIEW_TABLE (`TableAccessMiddleware`)

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas

A rota nao tem `:slug`, entao o `TableAccessMiddleware` so libera quem e
privilegiado pelo fecho de grupos (MASTER/ADMINISTRATOR) — os demais recebem
400 `TABLE_REQUIRED`. Alinha com `bulk-trash`/`bulk-restore` do mesmo recurso;
antes era `RoleMiddleware`, que olhava so o `role` do JWT (grupo principal).

`buildCsvStream` (core/csv).
