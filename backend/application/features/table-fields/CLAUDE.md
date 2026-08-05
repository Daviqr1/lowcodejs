# Table Fields

CRUD e gerenciamento de campos de uma tabela dinamica.

## Entidade

`IField` - Campo de tabela com tipo, formato, `permissions` ({ list, form,
detail } com binding por contexto — ausencia de binding = visivel), validacao e
configuracoes (relationship, dropdown, category, group). `showInFilter` controla
apenas a sidebar de filtros (nao e permissao). Os booleans
`showInList/showInForm/showInDetail` foram removidos.

## Endpoints

| Operacao | Metodo | Rota | Auth | Permissao |
|----------|--------|------|------|-----------|
| create | POST | `/tables/:slug/fields` | Sim | CREATE_FIELD |
| show | GET | `/tables/:slug/fields/:_id` | Sim | VIEW_FIELD |
| update | PUT | `/tables/:slug/fields/:_id` | Sim | UPDATE_FIELD |
| delete | DELETE | `/tables/:slug/fields/:_id` | Sim | REMOVE_FIELD |
| send-to-trash | PATCH | `/tables/:slug/fields/:_id/trash` | Sim | UPDATE_FIELD |
| remove-from-trash | PATCH | `/tables/:slug/fields/:_id/restore` | Sim | UPDATE_FIELD |
| add-category | POST | `/tables/:slug/fields/:_id/category` | Sim | UPDATE_FIELD |
| delete-category | DELETE | `/tables/:slug/fields/:_id/category/:categoryId` | Sim | UPDATE_FIELD |

## Repositorios

- `TableContractRepository` - Acesso e atualizacao da tabela pai
- `FieldContractRepository` - CRUD de campos, createMany, update, delete

## Schema Base

Definido em `table-field-base.schema.ts`: required, multiple, format,
`validations` (array de `{ rule, config }` — regras de `field.validations[]`;
`rule` ∈ `E_FIELD_VALIDATION`; default `[]`), `permissions` (FieldPermissionsSchema:
{ list, form, detail } → binding), showInFilter (controla a sidebar de filtros),
widthInForm, widthInList, widthInDetail, locked, defaultValue, relationship,
dropdown, category, group.

> O passe das regras configuradas em `validations` roda no create/update de
> **row** (`FieldValidationService`), não na criação do campo. Aqui só persiste.
