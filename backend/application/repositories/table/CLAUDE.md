# Table Repository

Repositorio da entidade Table (tabelas dinamicas do low-code).

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `table-contract.repository.ts` | Classe abstrata com interface e payload types |
| `table.repository.ts` | Implementacao com Mongoose |
| `table-in-memory.repository.ts` | Implementacao em memoria para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `create(payload)` | `ITable` | Cria tabela com schema, campos, metodos, permissions e members |
| `findById(_id, options?)` | `ITable \| null` | Busca por _id |
| `findBySlug(slug, options?)` | `ITable \| null` | Busca por slug |
| `findMany(payload)` | `ITable[]` | Query com paginacao, search, filtros |
| `update(payload)` | `ITable` | Atualiza por _id (campos parciais) |
| `updateMany(payload)` | `void` | Atualiza multiplas tabelas por _ids (style, trashed) |
| `delete(_id)` | `void` | Remove tabela |
| `count(payload)` | `number` | Conta tabelas matchando query |
| `renameSlug(old, new)` | `void` | Renomeia slug da colecao MongoDB |
| `dropCollection(slug)` | `void` | Remove colecao MongoDB inteira |
| `findByFieldIds(ids)` | `ITable[]` | Busca tabelas que contem determinados fields |

## Payloads

- `TableCreatePayload` - name, slug, _schema, description, logo, fields, type, style, permissions, members, owner, fieldOrderList/Form/Filter/Detail, methods, groups, order, layoutFields, rowSlugFieldId
- `TableQueryPayload` - page, perPage, search, type, owner, trashed, _ids, sort
- `TableUpdateManyPayload` - _ids + data (style, trashed, trashedAt)

## Comportamentos Unicos

- Entidade mais complexa do sistema com muitos campos de configuracao
- `renameSlug` e `dropCollection` operam diretamente na colecao MongoDB
- `findByFieldIds` permite busca reversa (quais tabelas usam um campo)
- Suporte a groups (IGroupConfiguration) e layoutFields
