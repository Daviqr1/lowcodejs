# Relationship Definition Repository

Repositorio da entidade RelationshipDefinition — a **fonte de verdade** de um
relacionamento entre tabelas (dois endpoints source/target + politica de
delete). Ver spec de relacionamento (§9/§10) e as migrations 14→18/28.

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `relationship-definition-contract.repository.ts` | Classe abstrata + payload types |
| `relationship-definition.repository.ts` | Implementacao com Mongoose |
| `relationship-definition-in-memory.repository.ts` | Implementacao em memoria para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `create(payload)` | `IRelationshipDefinition` | Cria a definicao (source, target, onDelete) |
| `findById(_id, options?)` | `IRelationshipDefinition \| null` | Busca por _id |
| `findByTable(tableId)` | `IRelationshipDefinition[]` | Definicoes que tocam a tabela em qualquer lado (source **ou** target) |
| `findBySourceField(fieldId)` | `IRelationshipDefinition \| null` | Definicao nao-trashed cujo lado source e o campo — guarda de dedup na materializacao (no maximo 1 por campo source) |
| `findMany(options?)` | `IRelationshipDefinition[]` | Todas (com filtro trashed) |
| `update(payload)` | `IRelationshipDefinition` | Atualiza name/source/target/onDelete |
| `delete(_id)` | `void` | Soft delete (trashed + trashedAt) |

## Payloads

- `RelationshipDefinitionCreatePayload` - name, source (IRelationshipEndpoint), target (IRelationshipEndpoint), onDelete (CASCADE/SET_NULL/RESTRICT)
- `RelationshipDefinitionUpdatePayload` - _id + campos parciais

## Comportamentos Unicos

- Um `IRelationshipEndpoint` = `{ table, field, visible, label }` — os dois lados
  do vinculo. O campo `RELATIONSHIP` de cada lado guarda `relationshipId` como
  back-pointer
- `findBySourceField` sustenta a idempotencia da materializacao (migration 28
  cria indice unique parcial por `source.field._id`)
- Delete e soft (a limpeza dos links fica com `RelationshipLinkRepository`)
