# `core/tools` (frontend)

Entries React das ferramentas do pacote `core`. Cada tool é uma página completa
montada pela rota dinâmica `routes/_private/tools/$package/$id/` e listada no
submenu **Ferramentas** da sidebar. A declaração canônica (manifest + endpoints

- regras de negócio) vive em `backend/extensions/core/tools/`.

## Extensões

| ID                     | Entry                            | Descrição                                                                                                                      |
| ---------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `clone-table`          | `clone-table/index.tsx`          | Clona uma ou mais tabelas a partir de modelos existentes ou templates built-in (Kanban, Card, etc.)                            |
| `doc-transcription`    | `doc-transcription/index.tsx`    | Transcrição de documentos via API externa (tabs Transcrever/Configurações). Também roda como plugin no slot `table.row.create` |
| `generate-test-data`   | `generate-test-data/index.tsx`   | Gera registros de teste em massa numa tabela, com estimativa de impacto e progresso por polling                                |
| `tables-import-export` | `tables-import-export/index.tsx` | Exporta/importa tabelas em JSON e importa linhas via CSV — ver CLAUDE.md próprio                                               |

## clone-table

`TableMultiSelect` (modelos base) + nome + checkbox "incluir dados". Usa
`useCloneTable` (`POST /tools/clone-table`) e, em sucesso, navega para a tabela
criada. Gated por `usePermission`; mostra `AccessDenied` sem permissão.

## doc-transcription

Página com `Tabs`: **Transcrever** (upload + resultado) e **Configurações** (URL
da API + tipos de documento, em `-config-tab.tsx` / `-document-type-form.tsx`).
O entry detecta se foi montado num **slot** (`slot` prop): nesse caso renderiza
só o `FillButton` (`-fill-button.tsx`) que preenche o formulário de criação de
registro via `onFillFields`. Restrito a MASTER/ADMINISTRATOR
(`permissions.view`).

## generate-test-data

`TableCombobox` + quantidade. Antes de gerar, chama `.../estimate` e mostra a
estimativa (registros reais x simulados, tamanho, avisos). Ao confirmar, inicia
o job assíncrono e faz polling de `.../status/:jobId` (~700ms) com barra de
progresso até `completed`/`failed`.

## tables-import-export

Leaf complexo com doc dedicado em `tables-import-export/CLAUDE.md`. Cobre
exportação/importação de tabelas em JSON (com renomeação e resolução de
conflitos), importação de linhas via CSV e o WebSocket de progresso
(`/table-import`).

## Convenções

- Entry é **index.tsx** com `export default function ...`
- Tools não recebem props (página completa); subcomponentes privados usam o
  prefixo `-` (ex.: `-config-tab.tsx`)
- Usa `PageShell`/`PageHeader` de `@/components/common/page-shell`
