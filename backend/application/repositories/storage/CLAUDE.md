# Storage Repository

Repositorio da entidade Storage (registros de arquivos armazenados).

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `storage-contract.repository.ts` | Classe abstrata com interface e payload types |
| `storage.repository.ts` | Implementacao com Mongoose |
| `storage-in-memory.repository.ts` | Implementacao em memoria para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `create(payload)` | `IStorage` | Cria registro com filename, mimetype, originalName, size |
| `createMany(payloads)` | `IStorage[]` | Cria multiplos registros de uma vez |
| `findById(_id, options?)` | `IStorage \| null` | Busca por _id |
| `findByFilename(filename, options?)` | `IStorage \| null` | Busca por filename |
| `findMany(payload)` | `IStorage[]` | Query com paginacao, search, filtro por mimetype |
| `update(payload)` | `IStorage` | Atualiza por _id (campos parciais) |
| `delete(_id)` | `IStorage \| null` | Remove registro e retorna o documento removido |
| `count(payload)` | `number` | Conta registros matchando query |

## Comportamentos Unicos

- `delete` retorna `IStorage | null` (diferente dos outros repositorios que retornam `void`)
- `createMany` para upload de multiplos arquivos
- Este repositorio gerencia apenas os metadados; o armazenamento fisico e feito pelo Storage Service (flydrive)
