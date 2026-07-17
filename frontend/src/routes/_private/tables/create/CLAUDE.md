# Criar Tabela

Formulario para criacao de nova tabela a partir do zero.

## Rota

| Rota             | Descricao                       |
| ---------------- | ------------------------------- |
| `/tables/create` | Formulario de criacao de tabela |

## Arquivos

| Arquivo            | Tipo       | Descricao                                                                                          |
| ------------------ | ---------- | -------------------------------------------------------------------------------------------------- |
| `index.tsx`        | Loader     | Rota vazia, sem pre-carregamento                                                                   |
| `index.lazy.tsx`   | Componente | Layout com header, formulario e footer com botoes Cancelar/Criar                                   |
| `-create-form.tsx` | Formulario | Schema Zod `TableCreateSchema` e campos: logo (upload), nome, slug, estilo (LIST/GALLERY/DOCUMENT) |

## Schema do Formulario

- `name`: string, 1-40 caracteres, validado por `TABLE_NAME_REGEX`
- `logo`: string nullable (ID do storage)
- `style`: enum restrito a LIST, GALLERY, DOCUMENT na criacao

## Fluxo

1. Verifica permissao `CREATE_TABLE` via `usePermission()`
2. Submissao via `useCreateTable` hook
3. Sucesso redireciona para `/tables/:slug` da tabela criada
4. Erros mapeados para campos do formulario via `createFieldErrorSetter`

## Dependencias

- `UploadingProvider` para controle de upload de logo
- `withForm` do TanStack Form para campos tipados
