# Detalhe da Tabela - Visualizacao com Multiplos Modos

Rota principal de visualizacao de uma tabela especifica. Suporta 9 modos de
visualizacao via `E_TABLE_STYLE`, carregados com lazy loading.

## Rota

| Rota                    | Descricao                                 |
| ----------------------- | ----------------------------------------- |
| `/tables/:slug`         | Visualizacao da tabela com rows paginados |
| `/tables/:slug/methods` | Edicao de metodos JavaScript da tabela    |

## Mapa de Visualizacoes (VIEW_MAP)

| E_TABLE_STYLE | Componente        | Skeleton                  | Extra Props            |
| ------------- | ----------------- | ------------------------- | ---------------------- |
| LIST          | TableListView     | TableListViewSkeleton     | Nao                    |
| GALLERY       | TableGridView     | TableGridViewSkeleton     | Nao                    |
| DOCUMENT      | TableDocumentView | TableDocumentViewSkeleton | Sim (tableSlug, table) |
| CARD          | TableCardView     | TableCardViewSkeleton     | Nao                    |
| MOSAIC        | TableMosaicView   | TableMosaicViewSkeleton   | Nao                    |
| KANBAN        | TableKanbanView   | TableKanbanViewSkeleton   | Sim (tableSlug, table) |
| FORUM         | TableForumView    | TableForumViewSkeleton    | Sim (tableSlug, table) |
| CALENDAR      | TableCalendarView | TableCalendarViewSkeleton | Sim (tableSlug, table) |
| GANTT         | TableGanttView    | TableGanttViewSkeleton    | Sim (tableSlug, table) |

## Arquivos

| Arquivo                    | Tipo       | Descricao                                                               |
| -------------------------- | ---------- | ----------------------------------------------------------------------- |
| `index.tsx`                | Loader     | Valida search (page, perPage, trashed), carrega tableDetail + rowList   |
| `index.lazy.tsx`           | Componente | Layout principal com header, filtros, view dinamica e paginacao         |
| `-table-skeleton.tsx`      | Skeleton   | Spinner central de carregamento                                         |
| `-table-configuration.tsx` | Componente | Dropdown de configuracao: campos, grupos, detalhes, metodos, API, embed |
| `-api-endpoints-modal.tsx` | Modal      | Exibe endpoints REST da API para a tabela                               |
| `-methods-form.tsx`        | Formulario | Campos de codigo IIFE para hooks onLoad, beforeSave, afterSave          |
| `methods.tsx`              | Loader     | Carrega tableDetail para rota de metodos                                |
| `methods.lazy.tsx`         | Componente | Pagina de edicao de metodos com tabs                                    |

> **Nota**: Os 9 componentes de view (`table-*-view.tsx`) e seus skeletons foram
> movidos para `@/components/common/table-views/`. Sao carregados via
> `React.lazy` no `VIEW_MAP` deste arquivo.

## Paginacao

- Views LIST, GALLERY, CARD, MOSAIC usam paginacao padrao
- Views KANBAN, DOCUMENT, FORUM, CALENDAR, GANTT forcam `page=1, perPage=100`
  (sem paginacao)

## Acesso Publico

- Permite acesso sem autenticacao quando o binding da acao (`table.permissions`)
  e PUBLIC
- Verifica `useAuthStore` para determinar se exibe botoes de navegacao
- Erros de permissao (TABLE_PRIVATE, FORM_VIEW_RESTRICTED, 401, 403) exibem tela
  de acesso negado

## Subdiretorios

| Diretorio   | Rota                     | Descricao                                                                        |
| ----------- | ------------------------ | -------------------------------------------------------------------------------- |
| `detail/`   | `/tables/:slug/detail`   | Edicao de detalhes/configuracao da tabela                                        |
| `field/`    | `/tables/:slug/field/*`  | Gerenciamento de campos                                                          |
| `row/`      | `/tables/:slug/row/*`    | Gerenciamento de registros (rows)                                                |
| `group/`    | `/tables/:slug/group/*`  | Gerenciamento de grupos de campos                                                |
| `$rowSlug/` | `/tables/:slug/:rowSlug` | Resolve slug amigavel do registro no client e redireciona para `row?_id=` (view) |
