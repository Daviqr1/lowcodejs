# Table Config

Componentes de campo para configuracao de tabelas e campos. Usados nos
formularios de criacao/edicao de tabelas e definicao de campos.

## Padrao

Todos usam `useFieldContext<string>` (maioria) e seguem o padrao Field + Label +
Select/Combobox + FieldError. As opcoes geralmente vem de constantes em
`@/lib/constant`.

## Arquivos

| Arquivo                                     | Componente                          | Descricao                                                                                                                                                                                                             |
| ------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table-field-type-select.tsx`               | `TableFieldTypeSelect`              | Select do tipo de campo (`FIELD_TYPE_OPTIONS`). Suporta `blockedTypes` e callback `onTypeChange`.                                                                                                                     |
| `table-field-validations-field.tsx`         | `TableFieldValidationsField`        | Multi-select das validações aplicáveis ao campo (`FIELD_VALIDATION_OPTIONS`, filtra por `fieldType`/`multiple`) + inputs de config (range min/max, is-not valores). Marca regras `async` como "validado no servidor". |
| `table-field-format-select.tsx`             | `TableFieldFormatSelect`            | Select de formato (TEXT_FORMAT, TEXT_LONG_FORMAT, DATE_FORMAT). Recebe `fieldType` para mapear opcoes.                                                                                                                |
| `table-field-dropdown-options.tsx`          | `TableFieldDropdownOptions`         | Editor de opcoes de dropdown com chips sortaveis (`ComboboxSortableChips`), suporte a cores e edicao de labels.                                                                                                       |
| `table-field-dropdown-default-value.tsx`    | `TableFieldDropdownDefaultValue`    | Select para valor padrao de dropdown. Usa `__none__` como sentinela para "sem valor".                                                                                                                                 |
| `table-field-category-tree.tsx`             | `TableFieldCategoryTree`            | Editor de arvore de categorias usando `TreeEditor`.                                                                                                                                                                   |
| `table-field-relationship-table-select.tsx` | `TableFieldRelationshipTableSelect` | Combobox para selecionar tabela de relacionamento. Usa `TableCombobox` com `excludeSlug`.                                                                                                                             |
| `table-field-relationship-order-select.tsx` | `TableFieldRelationshipOrderSelect` | Select de ordenacao (asc/desc) para relacionamento.                                                                                                                                                                   |
| `table-combobox-field.tsx`                  | `TableComboboxField`                | Combobox de tabela com tratamento de "nenhuma tabela" (Alert). Usa `useTablesReadPaginated`.                                                                                                                          |
| `filtered-table-combobox-field.tsx`         | `FilteredTableComboboxField`        | Combobox de tabela filtrada por `allowedTableIds`. Busca tabelas via API com IDs filtrados.                                                                                                                           |
| `table-style-select-field.tsx`              | `TableStyleSelectField`             | Select de estilo de visualizacao. Filtra estilos permitidos via `allowedStyles`.                                                                                                                                      |
| `table-layout-field-select.tsx`             | `TableLayoutFieldSelect`            | Select de campo para layout com opcao "Automatico". Usa `__auto__` como sentinela.                                                                                                                                    |
| `table-order-select-field.tsx`              | `TableOrderSelectField`             | Select generico de ordenacao com opcoes dinamicas.                                                                                                                                                                    |
| `index.ts`                                  | -                                   | Barrel export de todos os componentes                                                                                                                                                                                 |

## Dependencias internas

- `@/components/common/dynamic-table/table-selectors/` - `TableCombobox`,
  `TableComboboxFilteredSafe`
- `@/components/common/selectors/field-combobox` - `FieldCombobox`
- `@/components/common/tree-editor/` - `TreeEditor`
- `@/components/ui/combobox` - `ComboboxSortableChips`
