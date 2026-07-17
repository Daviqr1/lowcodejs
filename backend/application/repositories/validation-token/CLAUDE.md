# Validation Token Repository

Repositorio da entidade ValidationToken (tokens de validacao para magic link e reset de senha).

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `validation-token-contract.repository.ts` | Classe abstrata com interface e payload types |
| `validation-token.repository.ts` | Implementacao com Mongoose |
| `validation-token-in-memory.repository.ts` | Implementacao em memoria para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `create(payload)` | `IValidationToken` | Cria token com code, status e user (ref string) |
| `findById(_id, options?)` | `IValidationToken \| null` | Busca por _id |
| `findByCode(code, options?)` | `IValidationToken \| null` | Busca por code |
| `findMany(payload)` | `IValidationToken[]` | Query com paginacao, filtro por user e status |
| `update(payload)` | `IValidationToken` | Atualiza por _id (campos parciais) |
| `delete(_id)` | `void` | Remove token |
| `count(payload)` | `number` | Conta tokens matchando query |

## Payloads

- `ValidationTokenCreatePayload` - code, status (E_TOKEN_STATUS), user (ref string)
- `ValidationTokenQueryPayload` - page, perPage, user, status
