# Field Management

Interface de gerenciamento de campos da tabela. Permite ordenar,
mostrar/ocultar, configurar largura e excluir campos via UI com abas e
drag-drop.

## Arquivos

| Arquivo                            | Componente                                      | Descricao                                                                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field-management-context.tsx`     | `FieldManagementProvider`, `useFieldManagement` | Context com `FieldManagementActions`: fields, onToggleVisibility, onChangeWidth, onSaveOrder, onDeleteField, onEditField + estados de loading. Define tipos `VisibilityKey` e `WidthKey`. |
| `field-management.tsx`             | `FieldManagement` (compound)                    | Componente composto com `Root`, `Header`, `Tabs`, `List`, `TrashedList`.                                                                                                                  |
| `table-field-management-sheet.tsx` | `TableFieldManagementSheet`                     | Sheet lateral que embrulha `FieldManagement` para gerenciar campos em um drawer.                                                                                                          |

## Compound components

- `FieldManagement.Root` - Provider wrapper
- `FieldManagement.Header` - Titulo com botao de voltar
- `FieldManagement.Tabs` - Abas: Lista, Filtros, Formularios, Detalhes, Lixeira
- `FieldManagement.List` - Lista sortable de campos com toggle de visibilidade,
  input de largura e botao de editar
- `FieldManagement.TrashedList` - Lista de campos na lixeira com opcao de
  exclusao permanente (com dialog de confirmacao)

## Visibilidade e largura

`VisibilityKey` e apenas a chave do toggle na UI. Exceto `showInFilter` (que
mapeia para o campo real `field.showInFilter` — sidebar de filtros, nao e
permissao), as demais chaves mapeiam para o contexto de `field.permissions`
(`list`/`form`/`detail`) via `FIELD_CONTEXT_BY_VISIBILITY_KEY`: ligar grava
binding PUBLIC, desligar grava NOBODY.

| VisibilityKey  | WidthKey        | Aba         | Destino              |
| -------------- | --------------- | ----------- | -------------------- |
| `showInList`   | `widthInList`   | Lista       | `permissions.list`   |
| `showInFilter` | -               | Filtros     | `field.showInFilter` |
| `showInForm`   | `widthInForm`   | Formularios | `permissions.form`   |
| `showInDetail` | `widthInDetail` | Detalhes    | `permissions.detail` |

## Drag-drop

Usa `@dnd-kit/core` + `@dnd-kit/sortable` com `verticalListSortingStrategy`. A
nova ordem e salva via `onSaveOrder(visibilityKey, orderedFieldIds)`. O botao
"Salvar ordem" aparece somente apos alteracao.

## Dependencias

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- `@/components/ui/tabs`, `@/components/ui/dialog`
