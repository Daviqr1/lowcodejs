# Evaluation Repository

Repositorio da entidade Evaluation (avaliacoes/ratings em registros de tabela).

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `evaluation-contract.repository.ts` | Classe abstrata com interface e payload types |
| `evaluation.repository.ts` | Implementacao com Mongoose |
| `evaluation-in-memory.repository.ts` | Implementacao em memoria para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `create(payload)` | `IEvaluation` | Cria avaliacao com value (nota) e user (ref string) |
| `findByIdAndUser(_id, user, options?)` | `IEvaluation \| null` | Busca por _id e user |
| `findMany(payload)` | `IEvaluation[]` | Query com paginacao e filtro por user |
| `update(payload)` | `IEvaluation` | Atualiza por _id (campos parciais) |
| `delete(_id)` | `void` | Remove avaliacao |
| `count(payload)` | `number` | Conta avaliacoes matchando query |

## Payloads

- `EvaluationCreatePayload` - value (nota numerica), user (ref string)
- `EvaluationQueryPayload` - page, perPage, user
