# Criar Campo

Formulario para criacao de novo campo em uma tabela.

## Rota

| Rota                         | Descricao                      |
| ---------------------------- | ------------------------------ |
| `/tables/:slug/field/create` | Formulario de criacao de campo |

## Search Params

| Param        | Tipo                         | Descricao                              |
| ------------ | ---------------------------- | -------------------------------------- |
| `field-type` | enum E_FIELD_TYPE (opcional) | Pre-seleciona o tipo do campo          |
| `group`      | string (opcional)            | Slug do grupo onde o campo sera criado |

## Arquivos

| Arquivo            | Tipo       | Descricao                                                      |
| ------------------ | ---------- | -------------------------------------------------------------- |
| `index.tsx`        | Loader     | Valida search params, carrega `tableDetailOptions`             |
| `index.lazy.tsx`   | Componente | Layout com header, formulario e footer com Cancelar/Criar      |
| `-create-form.tsx` | Formulario | Schema `FieldCreateSchema` e campos dinamicos baseados no tipo |

## Schema (FieldCreateSchema)

- `name`: 1-40 caracteres
- `type`: tipo do campo (obrigatorio)
- `format`, `defaultValue`: strings opcionais
- `dropdown`: array de IDropdown (para tipo DROPDOWN)
- `relationship`: objeto com tableId, fieldId, order (para tipo RELATIONSHIP)
- `category`: array de TreeNode (para tipo CATEGORY)
- `permissions`: visibilidade por contexto `{ list, form, detail }`, cada um um
  binding (Grupo/Publico/Ninguem) — novo modelo
- Flags `multiple`, `required` e `showInFilter` (controla apenas a sidebar de
  filtros — nao e permissao)
- `widthInForm`, `widthInList`: numeros para largura

## Fluxo

1. Verifica permissao `CREATE_FIELD`
2. Se `group` presente, usa `useGroupFieldCreate`; senao, usa `useFieldCreate`
3. Sucesso redireciona para `/tables/:slug`
