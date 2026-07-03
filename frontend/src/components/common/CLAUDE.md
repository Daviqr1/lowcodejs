# Components Common

Componentes de logica de negocio reutilizaveis. Diferente de `components/ui`
(design system puro), estes componentes possuem regras de dominio, chamadas a
API e estado de aplicacao.

## Subdiretorios

| Diretorio                          | Descricao                                                                                                                | Dependencias-chave                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `action-dialog/`                   | Dialogo generico de confirmacao para acoes destrutivas/reversivas (delete, trash, restore)                               | TanStack Query, TanStack Router           |
| `auth-shell/`                      | Shell de layout das telas de autenticacao/setup (2 colunas: painel de marca + conteudo)                                  | dados do loader raiz, cn()                |
| `bulk-action-bar/`                 | Barra de acoes em lote para selecao de linhas (trash/restore/delete/extras); "Excluir permanentemente" so MASTER         | ui/button                                 |
| `calendar/`                        | Visualizacao de calendario (mes, semana, agenda) com dialogs de evento                                                   | date-fns, TanStack Form                   |
| `chat/`                            | Chat em tempo real com assistente IA via WebSocket                                                                       | useChatSocket, react-markdown             |
| `confirm-dialog/`                  | Dialog de confirmacao generico e controlado (Cancelar/Confirmar) sem mutation propria; caller dispara a acao             | ui/dialog, ui/button                      |
| `code-editor/`                     | Editor Monaco para scripts JS (hooks beforeSave/afterSave/onLoad)                                                        | @monaco-editor/react                      |
| `data-table/`                      | Tabela de dados generica com virtualizacao, DnD e resize                                                                 | TanStack Table, TanStack Virtual, dnd-kit |
| `datepicker/`                      | Date picker customizado com range e calendario dual                                                                      | date-fns                                  |
| `document/`                        | Visualizacao de documentos com sidebar, TOC, impressao e PDF                                                             | -                                         |
| `dynamic-table/`                   | **Componente central** - tabela dinamica com campos tipados, kanban, field management, selecao de tabelas e configuracao | TanStack Form, muitos sub-modulos         |
| `extension-slot/`                  | Ponto de injecao de plugins por slot (lazy import da entry React); aplica tableScope                                     | useExtensionsActiveList                   |
| `file-upload/`                     | Upload de arquivos com contexto de progresso                                                                             | UploadingContext                          |
| `filters/`                         | Sidebar e sheet de filtros para tabelas                                                                                  | TanStack Router search params             |
| `form-footer/`                     | Rodape de formulario com Cancelar/Salvar integrado ao estado do TanStack Form                                            | TanStack Form                             |
| `forum/`                           | Forum com canais, mensagens, documentos e multi-select de usuarios                                                       | WebSocket                                 |
| `gantt/`                           | Grafico de Gantt com timeline, barras e painel lateral                                                                   | -                                         |
| `layout/`                          | Layout da aplicacao: sidebar, header, profile, logo, login                                                               | -                                         |
| `page-shell/`                      | Shell de layout de pagina (compound Header/Content/Footer) + PageHeader com voltar                                       | ui/button                                 |
| `permanent-delete-confirm-dialog/` | Dialog de exclusao irreversivel com captcha matematico (soma/subtracao) antes de confirmar                               | ui/dialog, use-math-captcha               |
| `rich-editor/`                     | Editor de texto rico (TipTap) com toolbar, bubbles, upload de imagem                                                     | TipTap, upload                            |
| `route-status/`                    | Telas de status/erro (403, 404, erro, loading)                                                                           | TanStack Router                           |
| `selectors/`                       | Comboboxes e multi-selects de dominio (campo, grupo, menu, permissao, usuario)                                           | Combobox UI, hooks de query               |
| `table-views/`                     | 9 modos de visualizacao de tabelas dinamicas (list, kanban, forum, calendar, gantt, document, grid, card, mosaic)        | dynamic-table, calendar, gantt, forum     |
| `tree-editor/`                     | Editor de arvore hierarquica com inline editing e DnD                                                                    | -                                         |

## Arquivos raiz

| Arquivo                  | Descricao                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `input-search.tsx`       | Campo de busca que persiste o termo na URL via TanStack Router search params              |
| `pagination.tsx`         | Componente de paginacao com seletor de itens por pagina e navegacao first/prev/next/last  |
| `trash-button.tsx`       | Botao toggle para visualizar/sair da lixeira, usando search param `trashed` na URL        |
| `combobox-load-more.tsx` | Botao "Carregar mais" para comboboxes paginados (infinite query); some sem proxima pagina |

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
