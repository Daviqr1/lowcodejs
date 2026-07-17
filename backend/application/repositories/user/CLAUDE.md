# User Repository

Repositorio da entidade User (usuarios do sistema).

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `user-contract.repository.ts` | Classe abstrata com interface e payload types |
| `user.repository.ts` | Implementacao com Mongoose |
| `user-in-memory.repository.ts` | Implementacao em memoria para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `create(payload)` | `IUser` | Cria usuario com name, email, password, group, status |
| `findById(_id, options?)` | `IUser \| null` | Busca por _id |
| `findByEmail(email, options?)` | `IUser \| null` | Busca por email |
| `findMany(payload)` | `IUser[]` | Query com paginacao, search, filtro por status/trashed, sort |
| `update(payload)` | `IUser` | Atualiza por _id (campos parciais) |
| `delete(_id)` | `void` | Remove usuario |
| `count(payload)` | `number` | Conta usuarios matchando query |

## Payloads

- `UserCreatePayload` - name, email, password, group (ref string), status opcional
- `UserUpdatePayload` - _id + campos parciais
- `FindOptions` (entity.core) - trashed opcional
- `UserQueryPayload` - page, perPage, search, user (com role), _ids, status, trashed, sort
