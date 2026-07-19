# Document

Componentes para visualizacao de documentos estruturados por categorias
hierarquicas, com sidebar de navegacao e impressao nativa do navegador
(`window.print()` -> salvar em PDF).

## Arquivos

| Arquivo                           | Descricao                                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                        | Barrel de exports do modulo                                                                                           |
| `document-main.tsx`               | Area principal que renderiza lista de rows com headings agrupados por categoria                                       |
| `document-sidebar.tsx`            | Sidebar com arvore de categorias, drag-and-drop (dnd-kit), edicao inline e CRUD de secoes via API                     |
| `document-sidebar-tree.tsx`       | Arvore recursiva sortable com SortableContext, suporte a expand/collapse e edicao inline                              |
| `document-sidebar-add-dialog.tsx` | Dialog para adicionar nova secao (categoria) usando TanStack Form                                                     |
| `document-sidebar-helpers.ts`     | Funcoes utilitarias para arvore: buildParentMap, getAncestors, reorderInTree, insertNodeAt, isDescendant, getDropMode |
| `document-row.tsx`                | Renderiza um registro do documento com heading, blocos de conteudo e campos extras colapsaveis                        |
| `document-heading-row.tsx`        | Componente de heading dinamico (h2-h6) com icone e acoes opcionais                                                    |
| `document-toc.tsx`                | Sumario (table of contents) com links para ancoras, visivel apenas na impressao (print-only)                          |
| `document-print-button.tsx`       | Botao de impressao (canto superior direito) que dispara `window.print()`                                             |

## Impressao

- O botao dispara `window.print()` sobre o conteudo ja renderizado (classes
  `prose`), sem gerar PDF via biblioteca — fiel, instantaneo e o usuario salva
  em PDF pela propria janela de impressao.
- O CSS de impressao vive em `src/styles.css` (`@media print`): esconde o chrome
  (sidebar/header da app, barra de acoes da tabela, sumario) e remove o recorte
  dos containers de altura fixa para o conteudo fluir entre paginas. A view
  `table-document-view.tsx` marca `.document-print-root`/`.document-print-content`
  e injeta um titulo `print-only` com o nome da tabela no topo.

## Dependencias principais

- `@dnd-kit/core` e `@dnd-kit/sortable` para drag-and-drop na sidebar
- `@tanstack/react-query` para mutations de CRUD de categorias
- `@tanstack/react-router` para navegacao e parametros de rota
- Tipos `CatNode`, `DocBlock`, `IRow`, `IField` de `@/lib/document-helpers` e
  `@/lib/interfaces`

## Padroes importantes

- A sidebar usa `DndContext` com deteccao de `closestCenter` e tres modos de
  drop: `before`, `after`, `nest`
- Cada secao tem um menu kebab (tres pontinhos) revelado no hover com as acoes:
  Renomear, Criar subsecao, Criar artigo e Excluir. Double-click (renomear),
  botao `+` (subsecao) e drag (reordenar) permanecem como atalhos
- Excluir e cascateado via
  `DELETE /tables/:slug/fields/:_id/category/:categoryId` (remove o no +
  subsecoes e desvincula os artigos); confirmacao via dialog, com atualizacao
  otimista (`findNodeAndRemove`) que reverte em caso de erro
- Criar artigo navega para `/tables/:slug/row?category=<id>` — o form de criacao
  de registro abre com o campo CATEGORY pre-preenchido (search param `category`)
- Edicao inline de labels com double-click e persistencia otimista (reverte em
  caso de erro)
- O campo de categoria deve ser do tipo `E_FIELD_TYPE.CATEGORY` para habilitar
  gerenciamento
- Permissoes verificadas via `useTablePermission` (`UPDATE_FIELD`, `CREATE_ROW`,
  `UPDATE_ROW`)
- Headings agrupados por `leafId` -- mostra heading somente quando muda de
  categoria entre rows consecutivas
- CSS class `no-print` usada para ocultar elementos na impressao; `print-only`
  para elementos exclusivos de impressao
