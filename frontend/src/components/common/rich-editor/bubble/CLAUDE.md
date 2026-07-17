# Rich Editor - Bubble Menus

Bubble menus contextuais do Tiptap que aparecem ao interagir com diferentes
tipos de conteudo no editor.

## Arquivos

| Arquivo            | Descricao                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `text-bubble.tsx`  | Bubble menu para selecao de texto: bold, italic, underline, strikethrough, link, cor do texto e highlight |
| `link-bubble.tsx`  | Bubble menu para links: exibe URL truncada, botoes de abrir, editar (popover com LinkEditBlock) e remover |
| `table-bubble.tsx` | Bubble menu para tabelas: adicionar/remover colunas e linhas, mesclar/dividir celulas, remover tabela     |
| `image-bubble.tsx` | Bubble menu para imagens: alinhamento (esquerda, centro, direita) e remover                               |
| `mention-list.tsx` | Lista flutuante de sugestoes de mencao (`@`) com avatares, navegacao por teclado e carregamento paginado  |

## Dependencias principais

- `@tiptap/react/menus` (BubbleMenu) para posicionamento contextual
- `ToolbarButton` e `ColorPicker` do diretorio pai
- `LinkEditBlock` do diretorio pai para edicao de links

## Padroes importantes

- Cada bubble usa `pluginKey` unico para evitar conflitos: `textBubble`,
  `linkBubble`, `tableBubble`, `imageBubble`
- `shouldShow` controla visibilidade: TextBubble aparece em selecao de texto
  (exceto imagem/tabela), outros aparecem quando o tipo esta ativo
- TextBubble e o unico que inclui ColorPicker e alinhamento
- LinkBubble exibe URL truncada em 30 caracteres com tooltip do valor completo
- Todos usam a classe CSS `bubble-menu` para estilizacao base
