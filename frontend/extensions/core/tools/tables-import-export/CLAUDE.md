# Tables Import/Export (frontend) — `core/tools/tables-import-export`

UI da tool oficial de import/export. Página única
(`/tools/core/tables-import-export`) montada por `index.tsx` com `PageShell`,
organizada em três seções: **Exportar** e **Importar** (tabelas em JSON) lado a
lado, e **Importar via CSV** (linhas) embaixo. A lógica de servidor, formato de
arquivo v1/v2 e códigos de erro estão em
`backend/extensions/core/tools/tables-import-export/CLAUDE.md`.

## Arquivos

| Arquivo                      | Papel                                                            |
| ---------------------------- | ---------------------------------------------------------------- |
| `index.tsx`                  | `PageShell` + grid das 3 seções (entry default da tool)          |
| `export-section.tsx`         | Card de exportação de tabelas em JSON                            |
| `import-section.tsx`         | Card de importação de tabelas (dialog de renome + progresso)     |
| `import-csv-section.tsx`     | Card de importação de **linhas** via CSV                         |
| `use-table-import-socket.ts` | Hook do WebSocket `/table-import` (progresso da importação JSON) |

## Export (`export-section.tsx`)

`TableMultiSelect` para escolher uma ou mais tabelas + checkboxes
**estrutura**/**dados** (combinados viram `exportType`:
`structure | data | full`). Resolve os `slugs` selecionados e chama
`POST /tools/export-table`. Em sucesso, serializa a resposta num `Blob` JSON e
dispara o download (`URL.createObjectURL` + `<a download>`), nomeando o arquivo
por slug único ou `lowcodejs-N-tabelas`. Quando o backend responde 400
`MISSING_RELATED_TABLES`, guarda `missingTables` e mostra o aviso para o usuário
"Voltar para ajustar" ou reexportar com `acknowledgeMissingRelationships: true`.

## Import de tabelas (`import-section.tsx`)

Upload do JSON exportado → `POST /tools/import-table`. O fluxo destaca:

- **Conflitos e renome**: usa os códigos do backend (`IMPORT_CONFLICTS`,
  `TABLE_SLUG_ALREADY_EXISTS`, `DUPLICATE_TABLE_SLUGS`, `DUPLICATE_MENU_SLUGS`)
  e seus `errors.tables`/`errors.menus` (com os slugs **originais**) para abrir
  um dialog de renomeação por tabela e por item de menu folha, já
  pré-preenchendo sugestões. Reenvia com `tables`/`menus`.
- **Somente dados**: ao detectar `exportType === 'data'`, esconde os inputs de
  renome e lista os slugs de destino (read-only).
- **Progresso real**: a barra combina o evento do WebSocket (`phaseToPercent` —
  fase `rows` ocupa 15→80%) com um piso temporal (`timeCreep`, curva exponencial
  até 90%) para nunca congelar quando os eventos chegam espaçados. Rótulos de
  fase via `PHASE_LABELS` (estrutura → registros → relacionamentos → menus).

## Import de linhas via CSV (`import-csv-section.tsx`)

Fluxo separado, reaproveitado do core:

1. `TableComboboxPaginated` seleciona a tabela; botão **Baixar Template CSV**
   chama `downloadCsvFromApi('/tables/<slug>/rows/imports/csv/template')`.
2. Upload do CSV → `useTableRowsImportCsv` (`mutateAsync`) retorna `jobId`.
3. Estado por máquina de fases (`idle → uploading → processing → done | error`).
4. `useCsvImportSocket(baseUrl, jobId)` (hook **do core**, em `@/hooks`)
   acompanha `progress`/`completed`/`error`; ao concluir, invalida
   `queryKeys.rows.lists(slug)` e mostra toast com `imported`/`skipped`.

## WebSocket de import de tabelas (`use-table-import-socket.ts`)

Hook local que conecta ao namespace `/table-import` (Socket.IO,
`withCredentials`) e correlaciona eventos pelo `jobId` (ignora eventos de outros
jobs). `jobId = null` desconecta/reseta. Eventos: `progress` (`phase`,
`processed`, `total`, `current_table`, `failed`), `completed`
(`importedFields/Rows/Menus`, `tables[]`) e `error`. `baseUrl` vem do loader da
rota raiz (`getRouteApi('__root__').useLoaderData()`).

## Convenções

- Entry default é `index.tsx`; seções são componentes nomeados (sem prefixo `-`)
- Download client-side via `Blob` + `URL.createObjectURL` (export JSON) ou
  `downloadCsvFromApi` (`@/lib/csv-export`, template CSV)
- Toasts via Sonner; erros de API tratados por `handleApiError`
  (`@/lib/handle-api-error`)
