# Data Table

Tabela de dados generica construida sobre TanStack Table, com suporte a
virtualizacao, drag-and-drop de colunas, redimensionamento e navegacao por
teclado.

## Arquivos

| Arquivo                           | Descricao                                                                                                                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                        | Barrel export de todos os componentes                                                                                                                                                              |
| `data-table.tsx`                  | Componente principal. Recebe `TanstackTable<TData>` e renderiza header + body. Suporta virtualizacao (TanStack Virtual), DnD de colunas (dnd-kit), colunas pinadas (sticky), e CSS variable sizing |
| `data-table-body.tsx`             | Body alternativo simplificado, sem virtualizacao. Renderiza linhas com suporte a row click e colunas pinadas                                                                                       |
| `data-table-column-header.tsx`    | Header de coluna com dropdown menu para ordenacao (ASC/DESC via URL search params) e pin/unpin de colunas                                                                                          |
| `data-table-column-toggle.tsx`    | Controle de visibilidade de colunas via dropdown com checkboxes                                                                                                                                    |
| `data-table-draggable-header.tsx` | Wrapper para header com suporte a drag-and-drop via dnd-kit (useSortable)                                                                                                                          |
| `data-table-resize-handle.tsx`    | Handle de redimensionamento de colunas com feedback visual (linha azul durante resize)                                                                                                             |
| `data-table-skeleton.tsx`         | Skeleton de carregamento da tabela (linhas/colunas placeholder animadas)                                                                                                                           |

## Dependencias principais

- `@tanstack/react-table` para logica de tabela
- `@tanstack/react-virtual` (useVirtualizer) para virtualizacao de linhas
- `@dnd-kit/core` + `@dnd-kit/sortable` para reordenacao de colunas
- `@tanstack/react-router` (useSearch, useRouter) para ordenacao via URL params
- `@/hooks/use-table-keyboard-navigation` para navegacao por teclado entre
  celulas

## Padroes importantes

- Column sizing usa CSS variables (`--col-{id}-size`) para performance
- Ordenacao persiste na URL via search params (`orderBy`, `orderDir`)
- Virtualizacao opcional via prop `enableVirtualization` com overscan de 10
- Colunas pinadas usam `position: sticky` com z-index
- Generico: `DataTable<TData>` aceita qualquer tipo de dado
