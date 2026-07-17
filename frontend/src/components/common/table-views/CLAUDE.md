# Table Views

Componentes de visualizacao de tabelas dinamicas. Cada componente conecta o
sistema de tabelas dinamicas a um modo de visualizacao especifico
(E_TABLE_STYLE). Carregados via React.lazy em `tables/$slug/index.lazy.tsx`.

## Arquivos

| Arquivo                      | Descricao                                                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                   | Barrel export de todos os componentes                                                                                                                                   |
| `table-list-view.tsx`        | DataTable com colunas dinamicas, selecao em lote e acoes                                                                                                                |
| `table-kanban-view.tsx`      | Quadro kanban com DnD via dnd-kit                                                                                                                                       |
| `table-forum-view.tsx`       | Forum com canais, mensagens e documentos                                                                                                                                |
| `table-calendar-view.tsx`    | Calendario com modos mes, semana e agenda                                                                                                                               |
| `table-gantt-view.tsx`       | Grafico Gantt com timeline e barras                                                                                                                                     |
| `table-document-view.tsx`    | Documento com sidebar, TOC e PDF                                                                                                                                        |
| `table-grid-view.tsx`        | Cards em grid com campos dinamicos                                                                                                                                      |
| `table-card-view.tsx`        | Cards compactos com campos dinamicos                                                                                                                                    |
| `table-mosaic-view.tsx`      | Layout mosaico com campos dinamicos                                                                                                                                     |
| `table-*-view-skeleton.tsx`  | Skeleton de carregamento para cada modo                                                                                                                                 |
| `table-skeleton.tsx`         | Spinner central de carregamento generico                                                                                                                                |
| `use-row-selection.tsx`      | Context de selecao em lote (Set de ids) + `RowSelectionProvider` e os checkboxes `RowSelectCheckbox`/`RowSelectAllCheckbox`. Compartilhado por list/gallery/card/mosaic |
| `row-bulk-actions-bar.tsx`   | Barra sticky de acoes em lote (lixeira/restaurar/excluir + "Editar campo"), renderizada uma vez pelo `$slug/index.lazy.tsx`                                             |
| `bulk-edit-field-dialog.tsx` | Dialog de edicao em massa: escolhe 1 campo (dropdown/categoria/usuario/data/texto curto) e aplica o valor aos selecionados via `PATCH /tables/:slug/rows/bulk-update`   |

## Dependencias principais

- `@/components/common/dynamic-table` (celulas, seletores, kanban)
- `@/components/common/calendar`, `gantt`, `forum`, `document`
- `@/components/common/data-table` (DataTable, DataTableColumnToggle)
- `@/hooks/tanstack-query/use-table-read`, `use-table-row-read-paginated`
- `@/hooks/use-data-table`, `use-field-columns`, `use-table-permission`

## Padroes importantes

- Cada view recebe dados via hooks internos (useReadTable, useSuspenseQuery)
- Views LIST, GALLERY, CARD, MOSAIC usam paginacao padrao
- Views KANBAN, DOCUMENT, FORUM, CALENDAR, GANTT nao paginam (page=1,
  perPage=100)
- Skeletons co-localizados com seus respectivos componentes de view
- Views com `extraProps: true` no VIEW_MAP recebem `tableSlug` e `table`
  adicionais
