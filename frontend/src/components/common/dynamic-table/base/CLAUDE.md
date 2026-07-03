# Base

Componentes de campo de formulario base para a plataforma. Cada componente
encapsula um tipo de input com binding ao TanStack Form via `useFieldContext`.

## Padrao dos componentes

Todos seguem o mesmo padrao:

1. `useFieldContext<T>()` para obter o estado do campo
2. Calculo de `isInvalid` via `isTouched && !isValid`
3. Renderizacao de `FieldLabel` + input + `FieldError` condicional
4. Atributos de acessibilidade: `aria-invalid`, `aria-required`,
   `aria-describedby`

## Arquivos

| Arquivo                             | Componente                   | Tipo de valor        | Descricao                                                              |
| ----------------------------------- | ---------------------------- | -------------------- | ---------------------------------------------------------------------- |
| `field-text.tsx`                    | `FieldText`                  | `string`             | Input de texto com icone opcional                                      |
| `field-email.tsx`                   | `FieldEmail`                 | `string`             | Input email com icone MailIcon                                         |
| `field-password.tsx`                | `FieldPassword`              | `string`             | Input senha com toggle de visibilidade                                 |
| `field-url.tsx`                     | `FieldUrl`                   | `string`             | Input URL com icone LinkIcon                                           |
| `field-textarea.tsx`                | `FieldTextarea`              | `string`             | Textarea com rows configuravel                                         |
| `field-file-upload.tsx`             | `FieldFileUpload`            | `Array<File>`        | Upload de arquivo com preview opcional, usa `FileUploadWithStorage`    |
| `field-boolean-switch.tsx`          | `FieldBooleanSwitch`         | `boolean`            | Switch com labels Sim/Nao                                              |
| `field-switch.tsx`                  | `FieldSwitch`                | `E_USER_STATUS`      | Switch Ativo/Inativo para status de usuario                            |
| `field-group-combobox.tsx`          | `FieldGroupCombobox`         | `string`             | Combobox para selecao de grupo (usa `GroupCombobox`)                   |
| `field-menu-combobox.tsx`           | `FieldMenuCombobox`          | `string`             | Combobox para selecao de menu (usa `MenuCombobox`)                     |
| `field-menu-type-select.tsx`        | `FieldMenuTypeSelect`        | `string`             | Select para tipo de item de menu (`MENU_ITEM_TYPE_OPTIONS`)            |
| `field-permission-multi-select.tsx` | `FieldPermissionMultiSelect` | `Array<string>`      | Multi-select de permissoes                                             |
| `field-table-multi-select.tsx`      | `FieldTableMultiSelect`      | `Array<string>`      | Multi-select de tabelas (usa `TableMultiSelect` de `table-selectors/`) |
| `field-user-multi-select.tsx`       | `FieldUserMultiSelect`       | `Array<string>`      | Multi-select de usuarios                                               |
| `field-group-multi-select.tsx`      | `FieldGroupMultiSelect`      | `Array<string>`      | Multi-select de grupos (usa `GroupMultiSelect`)                        |
| `field-number.tsx`                  | `FieldNumber`                | `string`             | Input numerico (integer/decimal) com bloqueio de teclas invalidas      |
| `field-menu-position-select.tsx`    | `FieldMenuPositionSelect`    | `string`             | Select de posicao/ordem do item de menu                                |
| `field-owner-select.tsx`            | `FieldOwnerSelect`           | `string`             | Select de dono (owner) do recurso                                      |
| `field-permission-binding.tsx`      | `FieldPermissionBinding`     | `IPermissionBinding` | Binding de permissao (usa `PermissionBindingSelect`)                   |
| `field-table-members.tsx`           | `FieldTableMembers`          | `Array<member>`      | Editor de membros da tabela com perfis (owner/admin/editor/...)        |
| `index.ts`                          | -                            | -                    | Barrel export de todos os componentes                                  |

## Dependencias internas

- `@/components/ui/field` - `Field`, `FieldLabel`, `FieldError`
- `@/components/ui/input-group` - `InputGroup`, `InputGroupInput`,
  `InputGroupAddon`
- `@/components/ui/switch` - componente Switch
- `@/components/common/selectors/` - `GroupCombobox`, `MenuCombobox`,
  `PermissionMultiSelect`, `UserMultiSelect`
- `@/components/common/dynamic-table/table-selectors/` - `TableMultiSelect`
