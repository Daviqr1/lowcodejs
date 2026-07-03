# Dynamic Table

Sistema central de tabela dinamica da plataforma low-code. Fornece todos os
componentes de campo para formularios, configuracao de tabela, exibicao em grid,
kanban e gerenciamento de campos.

## Arquitetura

Todos os componentes de campo utilizam `useFieldContext` do TanStack Form para
binding bidirecional. Os componentes UI base vem de `@/components/ui` (shadcn).
Validacao e exibicao de erros seguem o padrao `isInvalid` + `FieldError`.

## Subdiretorios

| Diretorio                  | Descricao                        | Responsabilidade                                                                                                                            |
| -------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `base/`                    | Campos de formulario base        | Inputs genericos: text, email, password, url, textarea, switch, file upload, combobox de grupo/menu, multi-selects                          |
| `rich/`                    | Campos pesados com lazy-load     | Editor Monaco (codigo) e Tiptap (rich text), carregados via `React.lazy`                                                                    |
| `table-config/`            | Campos de configuracao de tabela | Selects e comboboxes para configurar propriedades de tabela e campos (tipo, formato, dropdown, relacionamento, visibilidade, estilo)        |
| `table-row/`               | Campos de dados de linha         | Inputs para criar/editar registros: text, date, dropdown, relationship, file, category, user, masked, password, rich text, field group      |
| `table-cells/`             | Celulas readonly do grid         | Exibicao somente-leitura em tabela/grid: text, date, dropdown badges, file links, reaction, evaluation stars, relationship, user, category  |
| `table-selectors/`         | Seletores de tabela              | Combobox e multi-select paginados para selecao de tabelas, com variantes filtrada e por estilo de visualizacao                              |
| `kanban/`                  | Visualizacao kanban              | Board completo: cards, colunas com drag-drop (dnd-kit), dialogs de criacao/edicao, tarefas, comentarios, descricao, campos extras           |
| `group-rows/`              | Grupos de campos aninhados       | CRUD de itens dentro de grupos de campos: data table, form dialog (Sheet), delete dialog                                                    |
| `relationship-management/` | Registros relacionados           | Lista/cria/edita/vincula/desvincula linhas de um campo de relacionamento (inline e data table), respeitando lado do vinculo e cardinalidade |
| `field-management/`        | UI de gerenciamento de campos    | Interface com abas para ordenar, mostrar/ocultar, configurar largura e excluir campos, usando drag-drop e context provider                  |

## Relacoes entre subdiretorios

- `base/` e `rich/` fornecem campos para formularios genericos da plataforma
  (menus, permissoes, usuarios)
- `table-config/` usa `table-selectors/` para comboboxes de tabela
- `table-row/` usa componentes de `table-cells/` (ex: `badgeStyleFromColor`) e
  `rich/` para rich text
- `table-cells/` usa `group-rows/` para exibir grupos de campos em modo detalhe
- `kanban/` usa `table-cells/` para exibicao e `table-row/` para edicao inline
- `group-rows/` usa `table-cells/` para renderizar celulas e `table-row/` para
  formularios de edicao
- `field-management/` opera independentemente via context provider
  (`FieldManagementActions`)

## Dependencias externas principais

| Dependencia                           | Uso                                     |
| ------------------------------------- | --------------------------------------- |
| `@tanstack/react-form`                | Binding de campos via `useFieldContext` |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag-drop em kanban e field-management  |
| `date-fns` + `ptBR`                   | Formatacao de datas                     |
| `react-imask`                         | Mascaras de input (telefone, CPF)       |
