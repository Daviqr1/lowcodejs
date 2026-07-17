# Registro de Field Components

Arquivos de re-export que organizam todos os componentes de campo por categoria.
Cada arquivo agrupa imports de `@/components/common/dynamic-table/` para
registro no `createFormHook`.

## Componentes por Arquivo

### base.ts - Campos Basicos (14)

| Componente                   | Descricao                  |
| ---------------------------- | -------------------------- |
| `FieldText`                  | Input de texto simples     |
| `FieldTextarea`              | Area de texto multilinha   |
| `FieldEmail`                 | Input de email             |
| `FieldPassword`              | Input de senha             |
| `FieldUrl`                   | Input de URL               |
| `FieldSwitch`                | Toggle switch              |
| `FieldBooleanSwitch`         | Switch booleano            |
| `FieldFileUpload`            | Upload de arquivo          |
| `FieldGroupCombobox`         | Combobox de grupos         |
| `FieldMenuCombobox`          | Combobox de menus          |
| `FieldMenuTypeSelect`        | Select de tipo de menu     |
| `FieldPermissionMultiSelect` | Multi-select de permissoes |
| `FieldUserMultiSelect`       | Multi-select de usuarios   |
| `FieldTableMultiSelect`      | Multi-select de tabelas    |

### rich.ts - Campos Pesados (2)

| Componente        | Descricao                                   |
| ----------------- | ------------------------------------------- |
| `FieldEditor`     | Editor de texto rico (lazy loading interno) |
| `FieldCodeEditor` | Editor de codigo (lazy loading interno)     |

### table-config.ts - Configuracao de Tabela (12)

| Componente                          | Descricao                                      |
| ----------------------------------- | ---------------------------------------------- |
| `TableComboboxField`                | Combobox de tabela                             |
| `TableLayoutFieldSelect`            | Select de layout                               |
| `TableOrderSelectField`             | Select de ordenacao                            |
| `TableStyleSelectField`             | Select de estilo                               |
| `TableFieldTypeSelect`              | Select de tipo de campo                        |
| `TableFieldValidationsField`        | Multi-select de validações do campo (+ config) |
| `TableFieldFormatSelect`            | Select de formato de campo                     |
| `TableFieldDropdownOptions`         | Opcoes de dropdown                             |
| `TableFieldDropdownDefaultValue`    | Valor padrao de dropdown                       |
| `TableFieldRelationshipTableSelect` | Select de tabela relacionada                   |
| `TableFieldRelationshipOrderSelect` | Select de ordem de relacionamento              |
| `TableFieldCategoryTree`            | Arvore de categorias                           |

### table-row.ts - Input de Dados de Registro (10)

| Componente                  | Descricao                      |
| --------------------------- | ------------------------------ |
| `TableRowTextField`         | Campo texto em linha           |
| `TableRowTextareaField`     | Campo textarea em linha        |
| `TableRowRichTextField`     | Campo rich text em linha       |
| `TableRowDropdownField`     | Campo dropdown em linha        |
| `TableRowDateField`         | Campo data em linha            |
| `TableRowFileField`         | Campo arquivo em linha         |
| `TableRowRelationshipField` | Campo relacionamento em linha  |
| `TableRowCategoryField`     | Campo categoria em linha       |
| `TableRowFieldGroupField`   | Campo grupo de campos em linha |
| `TableRowUserField`         | Campo usuario em linha         |

## Estrategia de Lazy Loading

- Campos em `rich.ts` (FieldEditor, FieldCodeEditor) usam `React.lazy`
  internamente nos proprios componentes
- Campos basicos e de tabela sao importados diretamente (sem lazy) por serem
  leves
- Essa separacao evita que editores pesados impactem o bundle inicial

## Como Adicionar um Novo Campo

1. Criar o componente em `@/components/common/dynamic-table/<categoria>/`
2. Adicionar o re-export no arquivo da categoria correspondente neste diretorio
3. Importar e registrar o componente em `form-hook.ts` dentro de
   `fieldComponents`
