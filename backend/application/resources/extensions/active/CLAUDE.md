# Active Extensions

Retorna as extensoes habilitadas+disponiveis **visiveis** ao usuario (respeita `permissions.view` do manifest). Consumido pela sidebar/slots do front.

## Endpoint
`GET /extensions/active` | Auth/Permission: Auth only

## Middlewares
`AuthenticationMiddleware` + a guarda de permissao indicada acima.

## Notas
`ExtensionContractRepository.findMany`.
