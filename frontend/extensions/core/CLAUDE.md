# Pacote `core` (frontend)

Espelho UI do `backend/extensions/core/`. Contém os entries React (componentes)
das extensões oficiais. Vive separado de `frontend/src/` mas é incluído no
projeto TypeScript via `tsconfig.json` (`"include": ["**/*.ts", "**/*.tsx"]`).

> As extensões **opcionais** de configuração de formulários (cascade-dropdown,
> conditional-fields) ficam no pacote irmão `forms/` — ver `../forms/CLAUDE.md`.

## Estrutura

```
core/
├── tools/
│   ├── clone-table/
│   │   └── index.tsx                ← componente default da tool
│   ├── tables-import-export/
│   │   ├── index.tsx
│   │   ├── export-section.tsx
│   │   └── import-section.tsx
│   └── doc-transcription/
│       ├── index.tsx                ← page com tabs (Transcrever | Configurações)
│       ├── -transcription-tab.tsx   ← upload + resultado
│       ├── -config-tab.tsx          ← URL da API + tipos de documento
│       └── -document-type-form.tsx  ← dialog de add/edit tipo
├── plugins/
│   ├── print-table/
│   │   └── index.tsx                ← botão Imprimir na toolbar (slot table.actions)
│   └── copy-record-link/
│       └── index.tsx                ← item "Copiar link" no dropdown da linha (slot table.row.actions)
└── modules/
    └── welcome/
        └── index.tsx                ← componente default do módulo (boas-vindas)
```

## Entries

| Tipo      | ID                     | Path                                   | Descrição                                                                                                                                                                                                          |
| --------- | ---------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tools`   | `clone-table`          | `tools/clone-table/index.tsx`          | UI de clonagem de tabelas                                                                                                                                                                                          |
| `tools`   | `tables-import-export` | `tools/tables-import-export/index.tsx` | Página com seções de Importar e Exportar tabela. Endpoints `POST /tools/export-table` e `POST /tools/import-table`                                                                                                 |
| `tools`   | `doc-transcription`    | `tools/doc-transcription/index.tsx`    | Transcrição de documentos via API externa                                                                                                                                                                          |
| `tools`   | `generate-test-data`   | `tools/generate-test-data/index.tsx`   | Gerador de registros de teste em massa: combobox de tabela + quantidade + etapa de estimativa (real x simulado, tamanho, avisos) antes de confirmar + barra de progresso com polling (`/tools/generate-test-data`) |
| `plugins` | `print-table`          | `plugins/print-table/index.tsx`        | Botão de impressão na toolbar (slot `table.actions`)                                                                                                                                                               |
| `plugins` | `copy-record-link`     | `plugins/copy-record-link/index.tsx`   | Item "Copiar link" no dropdown de ações da linha (slot `table.row.actions`) — copia `/tables/<slug>/row/<rowId>`                                                                                                   |
| `modules` | `welcome`              | `modules/welcome/index.tsx`            | Página de boas-vindas com atalhos (URL `/e/core/welcome`)                                                                                                                                                          |

## Convenções

- O arquivo deve ser `index.tsx` com `export default function ...`
- Pode importar livremente de `@/components/ui/*`, `@/hooks/...`, `@/lib/...`
- Para **tools**: nenhuma prop (página completa)
- Para **plugins**: recebe as props definidas pelo slot via spread do `context`
  do `<ExtensionSlot>`. Ver
  `frontend/src/components/common/extension-slot/CLAUDE.md` para o catálogo
