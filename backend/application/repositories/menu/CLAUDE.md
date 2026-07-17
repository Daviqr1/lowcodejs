# Menu Repository

Repositorio da entidade Menu (itens de navegacao do sistema).

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `menu-contract.repository.ts` | Classe abstrata com interface e payload types |
| `menu.repository.ts` | Implementacao com Mongoose |
| `menu-in-memory.repository.ts` | Implementacao em memoria para testes |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `create(payload)` | `IMenu` | Cria menu com name, slug, type, table, parent, url, html, owner, order |
| `findById(_id, options?)` | `IMenu \| null` | Busca por _id (options.trashed para filtro soft-delete) |
| `findBySlug(slug, options?)` | `IMenu \| null` | Busca por slug (options.trashed para filtro soft-delete) |
| `findMany(payload)` | `IMenu[]` | Query com paginacao, search, trashed, parent, sort |
| `update(payload)` | `IMenu` | Atualiza por _id (campos parciais + trashed) |
| `delete(_id)` | `void` | Remove menu |
| `count(payload)` | `number` | Conta menus matchando query |
| `findDescendantIds(menuId)` | `string[]` | Retorna IDs de todos os descendentes (submenus recursivos) |

## Comportamentos Unicos

- Suporte a hierarquia via campo `parent` (menus aninhados)
- `findDescendantIds` busca recursiva de submenus para exclusao em cascata
- Tipo flexivel: pode ser link para tabela, URL externa ou HTML customizado
