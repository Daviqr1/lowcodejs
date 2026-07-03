# Selectors

Comboboxes e multi-selects especializados para selecao de entidades do dominio
(campos, grupos, menus, permissoes, usuarios).

## Arquivos

| Arquivo                         | Descricao                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `index.ts`                      | Barrel export de todos os seletores                                                                                            |
| `field-combobox.tsx`            | Combobox para selecao de campo (IField) de uma tabela. Usa `useReadTable` para carregar campos por `tableSlug`                 |
| `group-combobox.tsx`            | Combobox para selecao de grupo de usuarios (nome amigavel para grupos de sistema via `resolveGroupName` + `USER_GROUP_MAPPER`) |
| `group-multi-select.tsx`        | Multi-select de grupos (chips) com nome amigavel; `excludeId` oculta um grupo (ex.: o proprio grupo em edicao)                 |
| `menu-combobox.tsx`             | Combobox para selecao de menu de navegacao                                                                                     |
| `extension-module-select.tsx`   | Select nativo de modulo de extensao ativo (`E_EXTENSION_TYPE.MODULE`); serializa `IMenuExtensionRef` como `pkg::extensionId`   |
| `permission-binding-select.tsx` | Combobox de binding de permissao (Publico/Ninguem/Grupo) -> `IPermissionBinding`, com descricao explicativa por opcao          |
| `permission-multi-select.tsx`   | Multi-select para selecao de permissoes                                                                                        |
| `user-multi-select.tsx`         | Multi-select de usuarios com busca paginada (`useUserReadPaginated`), chips de selecao, e cache local de usuarios selecionados |

## Dependencias principais

- Componentes UI `Combobox` (`@/components/ui/combobox`) com variantes:
  Combobox, ComboboxChips, ComboboxInput, ComboboxList, ComboboxItem
- Hooks de query: `useReadTable`, `useUserReadPaginated`
- `@/lib/interfaces` (IField, IUser)
- `@/lib/constant` (E_USER_STATUS)

## Padroes importantes

- Todos usam o sistema de Combobox do design system (nao Select nativo)
- Multi-selects retornam `Array<string>` (IDs) via `onValueChange`
- Comboboxes retornam string (ID unico) via `onValueChange`
- UserMultiSelect mantem cache local (`selectedCache`) para evitar perda de
  nomes quando a busca muda
- Filtra apenas usuarios ativos (`E_USER_STATUS.ACTIVE`)
- Labels PT-BR (Nenhum campo encontrado, Nenhum usuario encontrado)
