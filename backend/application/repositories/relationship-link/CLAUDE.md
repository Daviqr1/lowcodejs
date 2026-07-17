# Relationship Link Repository

Repositorio da entidade RelationshipLink — os **vinculos concretos** (arestas)
entre registros, sob uma RelationshipDefinition. Fonte de verdade dos dados do
relacionamento (nao ha mais embedded). Ver spec §9/§10.

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `relationship-link-contract.repository.ts` | Classe abstrata + payload types |
| `relationship-link.repository.ts` | Implementacao com Mongoose |
| `relationship-link-in-memory.repository.ts` | Implementacao em memoria para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `create(payload)` | `IRelationshipLink` | Cria um vinculo (relationshipId, sourceId, targetId, order?, metadata?) |
| `exists(payload)` | `boolean` | Vinculo (relationshipId, source, target) ja existe — idempotencia sob concorrencia |
| `findById(_id)` | `IRelationshipLink \| null` | Busca por _id |
| `findBySource(relationshipId, sourceId)` | `IRelationshipLink[]` | Vinculos de um registro no lado source |
| `findByTarget(relationshipId, targetId)` | `IRelationshipLink[]` | Vinculos de um registro no lado target |
| `findManyBySide(relationshipId, side, recordIds)` | `IRelationshipLink[]` | Batch de varios registros de um lado — hidratacao N:N sem N+1 |
| `paginateBySide(payload)` | `RelationshipLinkPage` | Pagina os vinculos de um registro num lado |
| `count(relationshipId, where)` | `number` | Conta vinculos de um lado (source **ou** target) |
| `countByRecord(relationshipId, recordId)` | `number` | Conta vinculos que tocam o registro em qualquer lado (guarda do RESTRICT) |
| `setOrder(_id, order)` | `void` | Reordena um vinculo |
| `delete(_id)` | `void` | Remove um vinculo (hard) |
| `deleteByRecord(relationshipId, recordId)` | `void` | Remove os vinculos que tocam um registro (SET_NULL/CASCADE) |
| `deleteByRelationship(relationshipId)` | `void` | Remove todos os vinculos de uma definicao (delete de tabela) |
| `findAllLinkedIds(relationshipId, side)` | `string[]` | Ids do lado com pelo menos um vinculo — filtro `excludeLinked` no autocomplete 1:1 |

## Payloads

- `RelationshipLinkCreatePayload` - relationshipId, sourceId, targetId, order?, metadata?
- `RelationshipLinkPaginatePayload` - relationshipId, side (`source`\|`target`), recordId, page, perPage
- `RelationshipLinkCountPayload` - `{ sourceId? }` **ou** `{ targetId? }` (um lado)

## Comportamentos Unicos

- Indice unique `(relationshipId, sourceId, targetId)` garante idempotencia; `exists` evita duplicar sob corrida
- `findManyBySide` e a base da hidratacao em lote (evita N+1 ao popular relacionamentos numa pagina)
- As politicas de delete (§9) sao aplicadas via `deleteByRecord`
  (SET_NULL/CASCADE) e `countByRecord` (RESTRICT); `deleteByRelationship` cobre
  o delete da tabela inteira
