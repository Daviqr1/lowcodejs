# Permissions Resource

Listagem de permissoes do sistema (somente leitura).

## Entidade

`IPermission` - definida em `@application/core/entity.core`

## Repositorio

`PermissionContractRepository` -> `PermissionMongooseRepository`

## Endpoints

| Operacao | Metodo | Rota | Descricao |
|----------|--------|------|-----------|
| list | GET | `/permissions` | Listar todas as permissoes |

## Auth

Exige autenticacao (`AuthenticationMiddleware({ optional: false })`).

## Observacao

Permissoes sao criadas via seeders (`database/seeders/`), nao via API. Este recurso e somente leitura.
