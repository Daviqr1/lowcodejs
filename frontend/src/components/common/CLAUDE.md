# Components Common

Componentes de logica de negocio reutilizaveis. Diferente de `components/ui`
(design system puro), estes componentes possuem regras de dominio, chamadas a
API e estado de aplicacao.

## Subdiretorios

| Diretorio         | Descricao                                                                                                                | Dependencias-chave                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `action-dialog/`  | Dialogo generico de confirmacao para acoes destrutivas/reversivas (delete, trash, restore)                               | TanStack Query, TanStack Router           |
| `calendar/`       | Visualizacao de calendario (mes, semana, agenda) com dialogs de evento                                                   | date-fns, TanStack Form                   |
| `chat/`           | Chat em tempo real com assistente IA via WebSocket                                                                       | useChatSocket, react-markdown             |
| `confirm-dialog/` | Dialog de confirmacao generico e controlado (Cancelar/Confirmar) sem mutation propria; caller dispara a acao             | ui/dialog, ui/button                      |
| `code-editor/`    | Editor Monaco para scripts JS (hooks beforeSave/afterSave/onLoad)                                                        | @monaco-editor/react                      |
| `data-table/`     | Tabela de dados generica com virtualizacao, DnD e resize                                                                 | TanStack Table, TanStack Virtual, dnd-kit |
| `datepicker/`     | Date picker customizado com range e calendario dual                                                                      | date-fns                                  |
| `document/`       | Visualizacao de documentos com sidebar, TOC, impressao e PDF                                                             | -                                         |
| `dynamic-table/`  | **Componente central** - tabela dinamica com campos tipados, kanban, field management, selecao de tabelas e configuracao | TanStack Form, muitos sub-modulos         |
| `file-upload/`    | Upload de arquivos com contexto de progresso                                                                             | UploadingContext                          |
| `filters/`        | Sidebar e sheet de filtros para tabelas                                                                                  | TanStack Router search params             |
| `forum/`          | Forum com canais, mensagens, documentos e multi-select de usuarios                                                       | WebSocket                                 |
| `gantt/`          | Grafico de Gantt com timeline, barras e painel lateral                                                                   | -                                         |
| `layout/`         | Layout da aplicacao: sidebar, header, profile, logo, login                                                               | -                                         |
| `rich-editor/`    | Editor de texto rico (TipTap) com toolbar, bubbles, upload de imagem                                                     | TipTap, upload                            |
| `route-status/`   | Telas de status/erro (403, 404, erro, loading)                                                                           | TanStack Router                           |
| `selectors/`      | Comboboxes e multi-selects de dominio (campo, grupo, menu, permissao, usuario)                                           | Combobox UI, hooks de query               |
| `table-views/`    | 9 modos de visualizacao de tabelas dinamicas (list, kanban, forum, calendar, gantt, document, grid, card, mosaic)        | dynamic-table, calendar, gantt, forum     |
| `tree-editor/`    | Editor de arvore hierarquica com inline editing e DnD                                                                    | -                                         |

## Arquivos raiz

| Arquivo            | Descricao                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `input-search.tsx` | Campo de busca que persiste o termo na URL via TanStack Router search params             |
| `pagination.tsx`   | Componente de paginacao com seletor de itens por pagina e navegacao first/prev/next/last |
| `trash-button.tsx` | Botao toggle para visualizar/sair da lixeira, usando search param `trashed` na URL       |

## Padroes gerais

- **Estado na URL**: busca, ordenacao, paginacao e filtros persistem via
  TanStack Router search params
- **Icones**: Lucide React em todo o projeto
- **Internacionalizacao**: UI em PT-BR (labels, placeholders, mensagens)
- **Lazy loading**: editores pesados (Monaco, TipTap) sao carregados sob demanda
- **Design system**: componentes UI base vem de `@/components/ui` (Shadcn/Radix)
- **Formularios**: TanStack Form (`useAppForm`) para formularios complexos

## Nota sobre dynamic-table/

O diretorio `dynamic-table/` e o componente mais complexo e central da
aplicacao. Contem sub-modulos para: campos base (`base/`), campos ricos
(`rich/`), celulas de tabela (`table-cells/`), linhas de formulario
(`table-row/`), configuracao de campos (`table-config/`), kanban (`kanban/`),
grupo de linhas (`group-rows/`), gerenciamento de campos (`field-management/`) e
seletores de tabela (`table-selectors/`). Praticamente toda visualizacao de
dados do sistema passa por ele.
