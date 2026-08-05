# Table Row

Componentes de campo para entrada de dados em formularios de criacao/edicao de
registros (rows). Diferente de `base/`, estes recebem `IField` como prop e
derivam configuracao (label, required, format, multiple) do metadado do campo.

## Padrao

Todos recebem `{ field: IField; disabled?: boolean }` e usam `useFieldContext`
para binding. O label vem de `field.name` e a validacao de `field.required`.

## Arquivos

| Arquivo                            | Componente                  | Tipo de valor             | Descricao                                                                                                                                                                                     |
| ---------------------------------- | --------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table-row-text-field.tsx`         | `TableRowTextField`         | `string`                  | Detecta formato (email, url, integer, decimal, password, masked) e delega para componente adequado. Bloqueia teclas invalidas para numeros.                                                   |
| `table-row-masked-text-field.tsx`  | `TableRowMaskedTextField`   | `string`                  | Input com mascara (`react-imask`). Suporta telefone, CPF e outros formatos via `getMaskConfig`.                                                                                               |
| `table-row-password-field.tsx`     | `TableRowPasswordField`     | `string`                  | Input senha com toggle de visibilidade e icone de cadeado.                                                                                                                                    |
| `table-row-textarea-field.tsx`     | `TableRowTextareaField`     | `string`                  | Textarea com modo compact (2 rows, max-height).                                                                                                                                               |
| `table-row-date-field.tsx`         | `TableRowDateField`         | `string` (ISO)            | Datepicker com formato configuravel. Usa `Datepicker` com locale ptBR.                                                                                                                        |
| `table-row-dropdown-field.tsx`     | `TableRowDropdownField`     | `Array<string>`           | Combobox single/multi para opcoes dropdown. Usa `badgeStyleFromColor` para cores. Normaliza valores entre string e objeto.                                                                    |
| `table-row-relationship-field.tsx` | `TableRowRelationshipField` | `Array<SearchableOption>` | Combobox com busca paginada via `useRelationshipRowsReadPaginated`. Suporta single/multi com debounce de 300ms.                                                                               |
| `table-row-user-field.tsx`         | `TableRowUserField`         | `Array<UserOption>`       | Combobox de usuarios com busca paginada. Cache local de usuarios selecionados. Filtra somente usuarios ativos.                                                                                |
| `table-row-file-field.tsx`         | `TableRowFileField`         | `{ files, storages }`     | Upload de arquivo. Converte storages existentes para File via fetch. Suporta single/multi (max 10).                                                                                           |
| `table-row-category-field.tsx`     | `TableRowCategoryField`     | `Array<string>`           | Seletor de categoria em arvore via Popover + TreeList. Suporta single/multi.                                                                                                                  |
| `table-row-rich-text-field.tsx`    | `TableRowRichTextField`     | `string`                  | Editor Tiptap lazy-loaded. Modo disabled exibe ContentViewer. Suporta variante compact.                                                                                                       |
| `table-row-field-group-field.tsx`  | `TableRowFieldGroupField`   | `Array<Record>`           | Grupo de campos aninhados. Renderiza sub-formularios por tipo de campo via `NestedGroupField`. Suporta single/multi items.                                                                    |
| `table-row-chips-limit.ts`         | `splitVisibleChips`         | -                         | Helper puro: divide os selecionados em `visible`/`hiddenCount` conforme `field.visibleChipsLimit` (null = sem limite). Usado por dropdown, relationship e user (multiple) para o resumo "+N". |
| `index.ts`                         | -                           | -                         | Barrel export                                                                                                                                                                                 |

## Dependencias internas

- `table-cells/table-row-badge-list` - `badgeStyleFromColor`
- `@/components/common/datepicker` - `Datepicker`
- `@/components/common/rich-editor` - `Editor`, `ContentViewer` (lazy)
- `@/components/common/tree-editor/tree-list` - `TreeList`
- `@/components/common/file-upload/file-upload-with-storage`
- `@/lib/field-masks` - `getMaskConfig`, `isFormatMasked`, `isPasswordFormat`
