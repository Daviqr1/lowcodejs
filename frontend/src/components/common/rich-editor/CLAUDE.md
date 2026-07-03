# Rich Editor

Editor WYSIWYG baseado em Tiptap com suporte a multiplos modos (rich, markdown,
HTML, preview), toolbar completa, bubble menus contextuais e upload de imagens.

## Arquivos

| Arquivo               | Descricao                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `index.ts`            | Barrel de exports: Editor, EditorProps, EditorMode, EditorBubble, EditorCharCount, EditorToolbar, ContentViewer     |
| `editor.tsx`          | Componente principal Editor com Tiptap, modos de edicao, sync de conteudo entre modos e debounce                    |
| `toolbar.tsx`         | Toolbar com botoes de formatacao: headings, bold/italic/underline, cores, alinhamento, listas, link, imagem, tabela |
| `viewer.tsx`          | ContentViewer renderiza markdown/HTML com react-markdown, rehype-raw e rehype-highlight                             |
| `toolbar-button.tsx`  | Botao toggle da toolbar com tooltip usando Radix Toggle                                                             |
| `color-picker.tsx`    | Popover de selecao de cor com paleta, cores recentes persistidas em localStorage                                    |
| `image-upload.tsx`    | Dialog de upload de imagem com preview e upload via API de storage                                                  |
| `link-edit-block.tsx` | Formulario inline para editar URL, texto e target de links                                                          |
| `table-picker.tsx`    | Popover de selecao de tamanho de tabela (grid visual ate 10x10)                                                     |
| `upload.ts`           | Funcao utilitaria uploadFile que envia arquivo para POST /storage e retorna URL                                     |
| `editor.css`          | Estilos CSS para o editor Tiptap (prose, tabelas, placeholders)                                                     |
| `base.md`             | Documentacao base do editor                                                                                         |
| `bubble/`             | Subdiretorio com bubble menus contextuais (possui CLAUDE.md proprio)                                                |
| `extensions/`         | Subdiretorio de extensoes customizadas do Tiptap (mention `@`) (possui CLAUDE.md proprio)                           |

## Dependencias principais

- `@tiptap/react` e extensoes: StarterKit, Underline, Color, Highlight, Image,
  Link, Table, TextAlign, CharacterCount, Placeholder
- `tiptap-markdown` para conversao markdown bidirecional
- `react-markdown` com `remark-gfm`, `rehype-raw`, `rehype-highlight` no viewer
- `@radix-ui/react-toggle` no toolbar-button

## Padroes importantes

- Editor suporta 4 modos: `rich` (WYSIWYG), `markdown` (textarea), `html`
  (textarea), `preview` (ContentViewer)
- Alternancia de modo sincroniza conteudo automaticamente (rich -> md via
  storage.markdown.getMarkdown)
- Valor controlado via props `value`/`onChange` com debounce configuravel
  (default 300ms)
- `focusKey` permite forcar reset do conteudo (util para recarregar ao trocar de
  contexto)
- Variante `compact` remove bordas e aplica classe `editor-compact`
- Cores recentes persistidas em localStorage com chaves `editor-recent-colors` e
  `editor-recent-highlight`
- Upload de imagem inline: seleciona arquivo, preview, upload via API, insere
  URL no editor
