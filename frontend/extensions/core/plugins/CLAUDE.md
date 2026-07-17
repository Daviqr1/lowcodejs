# `core/plugins` (frontend)

Entries React dos plugins do pacote `core`. Plugins são botões/widgets pequenos
injetados em slots do core via `<ExtensionSlot id="...">`. A declaração canônica
(manifest + slot) vive em `backend/extensions/core/plugins/`.

## Extensões

| ID                 | Slot                | Entry                        | Descrição                                                                   |
| ------------------ | ------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `print-table`      | `table.actions`     | `print-table/index.tsx`      | Botão na toolbar da tabela que chama `window.print()`. Plugin de referência |
| `copy-record-link` | `table.row.actions` | `copy-record-link/index.tsx` | Item no dropdown da linha que copia o link direto do registro               |

## print-table

`Button` com `Tooltip` e ícone `PrinterIcon`. `onClick` dispara
`window.print()`. Recebe `table?` via context do slot `table.actions` para
compor o rótulo acessível (`Imprimir {table.name}`).

## copy-record-link

`DropdownMenuItem` ("Copiar link") no slot `table.row.actions`. Monta a URL do
registro a partir de `window.location.origin` + `slug` + `row`: usa
`/tables/<slug>/<sharedRowSlug>` quando há slug amigável, senão cai no fallback
`/tables/<slug>/row?_id=<rowId>&mode=view`. Copia via `navigator.clipboard` e
mostra toast (Sonner) de sucesso/erro.

## Convenções

- Entry é **index.tsx** com `export default function ...`
- Recebe as props do slot (`table`, `row`, `slug`) via spread do `context` do
  `<ExtensionSlot>` — catálogo de slots em
  `frontend/src/components/common/extension-slot/CLAUDE.md`
- Usa apenas o design system (`@/components/ui/*`) e `toast` do Sonner
