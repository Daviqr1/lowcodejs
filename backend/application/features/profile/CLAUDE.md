# Profile Resource

Visualizacao e atualizacao do perfil do usuario autenticado.

## Entidade

`IUser` - definida em `@application/core/entity.core`

## Repositorio

`UserContractRepository` -> `UserMongooseRepository`

## Endpoints

| Operacao | Metodo | Rota | Descricao |
|----------|--------|------|-----------|
| show | GET | `/profile` | Buscar perfil do usuario autenticado |
| update | PUT | `/profile` | Atualizar perfil do usuario autenticado |

## Auth

Todas as operacoes exigem autenticacao (`AuthenticationMiddleware({ optional: false })`).

## Diferencial

O ID do usuario vem do token JWT (`request.user.sub`), nao de parametros de rota. O usuario so pode ver/editar o proprio perfil.
