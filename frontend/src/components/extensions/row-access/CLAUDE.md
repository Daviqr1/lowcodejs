# Row Access

UI de configuração do plugin **Row Access Control** (controle de acesso a nível
de linha). Um `Sheet` permite configurar visibilidade por grupo, janela de data
e bypass do dono, e aplicar a mesma configuração em lote a várias tabelas.

Espelha o contrato do backend v3 (**group-keyed**: `groupMatrix` em vez de
`roleMatrix`). MASTER e ADMINISTRATOR são bypassados no backend — não precisam
ser marcados na matriz.

## Arquivos

| Arquivo                         | Componente / Export                                                                                     | Descricao                                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                      | `RowAccessSettings`, `VisibilitySettings`, `DateWindowSettings`, defaults, regex, `isRowAccessSettings` | Contrato compartilhado + valores default (`DEFAULT_VISIBILITY_VALUES`, `DEFAULT_ROW_ACCESS_SETTINGS`), regex de validação e type guard.                                                 |
| `row-access-config-sheet.tsx`   | `RowAccessConfigSheet`                                                                                  | Sheet principal: seleciona tabelas (`TableMultiSelect`), monta `RowAccessSettings` e persiste em lote via `useExtensionBulkConfigureTableSettings`. Modo "editar" via `initialTableId`. |
| `visibility-values-editor.tsx`  | `VisibilityValuesEditor`                                                                                | Editor dos valores de visibilidade (UPPER_SNAKE_CASE, máx `MAX_VISIBILITY_VALUES`); ao remover valor, remove a key correspondente da matriz.                                            |
| `group-matrix.tsx`              | `GroupMatrix`                                                                                           | Matriz valor×grupo (linhas = valores, colunas = grupos do sistema); cada célula é um checkbox marcando se o grupo vê aquele valor.                                                      |
| `date-window-mode-selector.tsx` | `DateWindowModeSelector`                                                                                | Seletor do modo de janela de data: `off`, `createdAt-sliding`, `createdAt-fixed`, `field-range`.                                                                                        |
| `configured-tables-list.tsx`    | `ConfiguredTablesList`                                                                                  | Lista compacta das tabelas já configuradas; resolve nomes via `tableListOptions` e agrupa excedente em dropdown "+N mais".                                                              |

## Dependencias principais

- `@tanstack/react-query` (useQuery/useSuspenseQuery) + `groupAllOptions`,
  `tableListOptions` de `_query-options`
- `useExtensionBulkConfigureTableSettings` para persistir a config em lote
- `@/components/common/dynamic-table/table-selectors/table-multi-select`
  (`TableMultiSelect`)
- `@/components/ui/*` (Sheet, Select, Checkbox, Field, Badge)
- Tipos `IExtension`, `IGroup` de `@/lib/interfaces`

## Padroes importantes

- **group-keyed**: `groupMatrix` mapeia `value → groupIds` que enxergam aquele
  valor
- `VisibilitySettings.values` e `groupMatrix` andam juntos (remover valor limpa
  a key)
- Validação: `VISIBILITY_VALUE_REGEX` (UPPER_SNAKE_CASE), `FIELD_SLUG_REGEX`
  (lower_snake)
- Consumido pela rota `/extensions`
  (`routes/_private/extensions/index.lazy.tsx`)
- UI em PT-BR
