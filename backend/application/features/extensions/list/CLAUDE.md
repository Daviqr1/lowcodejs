# List Extensions

Lista **todas** as extensoes (habilitadas ou nao) para gestao no Workshop.

## Endpoint
`GET /extensions` | Auth/Permission: MANAGE_TOOLS

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
MASTER/gestao. `ExtensionContractRepository.findMany`.
