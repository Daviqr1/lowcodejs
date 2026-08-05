# Toggle Extension

Liga/desliga uma extensao (`enabled`).

## Endpoint
`PATCH /extensions/:_id/toggle` | Auth/Permission: MANAGE_TOOLS

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
`ExtensionContractRepository.toggleEnabled`.
