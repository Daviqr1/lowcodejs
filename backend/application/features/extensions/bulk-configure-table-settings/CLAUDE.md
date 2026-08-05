# Bulk Configure Table Settings

Persiste settings por tabela em lote (`tableSettings[tableId]`) para plugins row-access-guard.

## Endpoint
`PATCH /extensions/:_id/bulk-table-settings` | Auth/Permission: MANAGE_PLUGINS

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
`ExtensionContractRepository.updateTableSettings`.
