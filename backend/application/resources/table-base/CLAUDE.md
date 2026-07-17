# Table Base

CRUD e gerenciamento de tabelas dinamicas da plataforma low-code.

## Entidade

`ITable` - Tabela dinamica com campos, schema, estilo, `permissions` (mapa das
10 acoes → binding), `members[]` (convidados com perfil) e `owner`. Os campos
legados `visibility`/`collaboration`/`administrators` foram removidos do schema —
nao ha mais fallback.

## Endpoints

| Operacao | Metodo | Rota | Auth | Permissao |
|----------|--------|------|------|-----------|
| create | POST | `/tables` | Sim | CREATE_TABLE |
| schema-import | POST | `/tables/schema-import` | Sim | CREATE_TABLE |
| paginated | GET | `/tables/paginated` | Sim | - |
| export-csv | GET | `/tables/exports/csv` | Sim | MASTER/ADMINISTRATOR (cap 500.000 linhas) |
| show | GET | `/tables/:slug` | Opcional | VIEW_TABLE |
| update | PUT | `/tables/:slug` | Sim | UPDATE_TABLE |
| delete | DELETE | `/tables/:slug` | Sim | REMOVE_TABLE |
| send-to-trash | PATCH | `/tables/:slug/trash` | Sim | UPDATE_TABLE |
| remove-from-trash | PATCH | `/tables/:slug/restore` | Sim | UPDATE_TABLE |

## Repositorios

- `TableContractRepository` - CRUD de tabelas, renameSlug, dropCollection, findByFieldIds, updateMany
- `FieldContractRepository` - CRUD de campos, createMany, deleteMany, updateRelationshipTableSlug
- `UserContractRepository` - Validacao de membros/owner ativos

## Schema Base

Definido em `table-base.schema.ts`: TablePermissionBindingSchema,
TablePermissionsSchema (mapa acao→binding), TableMembersSchema
(`{ user, profile }`), TableStyleSchema, TableFieldOrderListSchema,
TableFieldOrderFormSchema, TableOrderSchema, TableLayoutFieldsSchema,
TableMethodSchema. (`owner` e validado direto nos validators de create/update.)
