# Reaction Repository

Repositorio da entidade Reaction (reacoes/likes em registros de tabela).

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `reaction-contract.repository.ts` | Classe abstrata com interface e payload types |
| `reaction.repository.ts` | Implementacao com Mongoose |
| `reaction-in-memory.repository.ts` | Implementacao em memoria para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `create(payload)` | `IReaction` | Cria reacao com type e user (ref string) |
| `findByIdAndUser(_id, user, options?)` | `IReaction \| null` | Busca por _id e user |
| `findMany(payload)` | `IReaction[]` | Query com paginacao, filtro por user e type |
| `update(payload)` | `IReaction` | Atualiza por _id (campos parciais) |
| `delete(_id)` | `void` | Remove reacao |
| `count(payload)` | `number` | Conta reacoes matchando query |

## Payloads

- `ReactionCreatePayload` - type (E_REACTION_TYPE), user (ref string)
- `ReactionQueryPayload` - page, perPage, user, type
