# Users Resource

Gerenciamento de usuarios da plataforma (CRUD).

## Entidade

`IUser` - definida em `@application/core/entity.core`

## Repositorio

`UserContractRepository` -> `UserMongooseRepository`

## Servicos

`EmailQueueContractService` - enfileira email apos create (welcome) e update (campos sensiveis: password/email/status). Worker BullMQ processa o envio

## Endpoints

| Operacao | Metodo | Rota | Descricao |
|----------|--------|------|-----------|
| create | POST | `/users` | Criar novo usuario |
| paginated | GET | `/users/paginated` | Listar usuarios com paginacao |
| export-csv | GET | `/users/exports/csv` | Exporta usuarios em CSV (MASTER/ADMINISTRATOR; cap 500.000 linhas) |
| show | GET | `/users/:_id` | Buscar usuario por ID |
| update | PATCH | `/users/:_id` | Atualizar usuario |
| bulk-update | PATCH | `/users/bulk-update` | Alterar status (ACTIVE/INACTIVE) de varios usuarios (exclui o proprio) |

## Auth

Todas as operacoes exigem autenticacao (`AuthenticationMiddleware({ optional: false })`).

## Validator Base

`user-base.validator.ts` - Schema Zod reutilizado por create e update:
- `name`: string, required, trim, min 1
- `email`: string, email, trim
- `group`: string, required, min 1
