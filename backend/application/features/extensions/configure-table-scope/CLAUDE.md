# Configure Table Scope

Define o escopo de tabelas da extensao (`all`/`specific`). Para plugins row-access-guard, aciona `onTableBound`.

## Endpoint
`PATCH /extensions/:_id/table-scope` | Auth/Permission: MANAGE_PLUGINS

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
`ExtensionContractRepository.updateTableScope`.
