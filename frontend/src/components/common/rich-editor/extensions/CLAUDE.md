# Rich Editor — Extensions (Tiptap)

Plugins/extensões customizadas do Tiptap usadas pelo Rich Editor. Cada arquivo
estende uma extensão base do Tiptap com comportamento próprio (UI flutuante,
resolução assíncrona, serialização markdown). Para o editor em si, ver
`rich-editor/CLAUDE.md` (diretório pai).

## Arquivos

| Arquivo       | Descrição                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `mention.tsx` | Extensão de menção `@`: estende `@tiptap/extension-mention` com popup flutuante, sugestões assíncronas e markdown |

## mention.tsx

Estende `Mention.extend()` para adicionar menções `@` com autocomplete:

- **`buildMentionExtension(config)`**: constrói a extensão configurada
  (`HTMLAttributes`, `renderText` no formato `@label`, `suggestion`)
- **`SuggestionOptions`**: `char: '@'`, `items()` resolve itens paginados via
  callback `resolvePage(query, page)` (retorna itens + `hasMore`), e `render()`
  expõe o ciclo de vida (`onStart`/`onUpdate`/`onKeyDown`/`onExit`)
- **Popup flutuante**: `MentionFloatingPopup` (React) posicionado via
  `@floating-ui/react-dom` (middleware offset/flip/shift/size);
  montado/desmontado por `createPopup()` usando `createRoot`. Renderiza
  `MentionList` (de `bubble/`)
- **`addStorage()`**: serializa a menção para markdown como
  `<span class="mention" data-id data-label>@label</span>`
- **`extractMentionIds(editor)`**: percorre `editor.state.doc.descendants()` e
  retorna os IDs de todas as menções do documento

## Convenções

- Tipos/exports relevantes saem pelo barrel `rich-editor/index.ts`:
  `buildMentionExtension`, `extractMentionIds`, `MentionConfig`, `MentionPage`,
  `ResolveMentionPage` (e `MentionItem`/`MentionListHandle` de
  `bubble/mention-list`)
- A extensão só é montada no `editor.tsx` quando `mentions?.enabled` é
  verdadeiro; o resolver assíncrono consulta o backend pelos candidatos de
  menção
