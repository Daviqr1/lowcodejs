# User Group Repository

Repositorio da entidade Group (grupos de usuarios com permissoes/roles).

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `user-group-contract.repository.ts` | Classe abstrata com interface e payload types |
| `user-group.repository.ts` | Implementacao com Mongoose |
| `user-group-in-memory.repository.ts` | Implementacao em memoria para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `create(payload)` | `IGroup` | Cria grupo com name, slug, description, permissions |
| `findById(_id, options?)` | `IGroup \| null` | Busca por _id |
| `findBySlug(slug, options?)` | `IGroup \| null` | Busca por slug |
| `findMany(payload)` | `IGroup[]` | Query com paginacao, search, sort |
| `update(payload)` | `IGroup` | Atualiza por _id (campos parciais) |
| `delete(_id)` | `void` | Remove grupo |
| `count(payload)` | `number` | Conta grupos matchando query |

## Payloads

- `UserGroupCreatePayload` - name, slug, description opcional, permissions (array de ref strings)
- `UserGroupUpdatePayload` - _id + campos parciais
- `FindOptions` (entity.core) - trashed opcional
- `UserGroupQueryPayload` - page, perPage, search, user (com role), sort
