# Table Rows

CRUD e operacoes especiais em registros (rows) de tabelas dinamicas.

## Entidade

`IRow` - Registro dinamico de tabela. Schema definido em runtime pela tabela pai. Campos nativos: _id, creator, trashed, trashedAt, createdAt, updatedAt.

## Endpoints

| Operacao | Metodo | Rota | Auth | Permissao |
|----------|--------|------|------|-----------|
| create | POST | `/tables/:slug/rows` | Opcional | CREATE_ROW |
| paginated | GET | `/tables/:slug/rows/paginated` | Opcional | VIEW_ROW |
| export-csv | GET | `/tables/:slug/rows/exports/csv` | Sim | MASTER/ADMINISTRATOR + VIEW_ROW (cap 500.000 linhas, colunas dinâmicas) |
| show | GET | `/tables/:slug/rows/:_id` | Opcional | VIEW_ROW |
| update | PUT | `/tables/:slug/rows/:_id` | Sim | UPDATE_ROW |
| delete | DELETE | `/tables/:slug/rows/:_id` | Sim | REMOVE_ROW |
| send-to-trash | PATCH | `/tables/:slug/rows/:_id/trash` | Sim | UPDATE_ROW |
| remove-from-trash | PATCH | `/tables/:slug/rows/:_id/restore` | Sim | UPDATE_ROW |
| bulk-update | PATCH | `/tables/:slug/rows/bulk-update` | Sim | UPDATE_ROW |
| bulk-trash | PATCH | `/tables/:slug/rows/bulk-trash` | Sim | UPDATE_ROW |
| bulk-restore | PATCH | `/tables/:slug/rows/bulk-restore` | Sim | UPDATE_ROW |
| reaction | POST | `/tables/:slug/rows/:_id/reaction` | Sim | UPDATE_ROW |
| evaluation | POST | `/tables/:slug/rows/:_id/evaluation` | Sim | UPDATE_ROW |
| forum-message | POST/PUT/DELETE | `/tables/:slug/rows/:_id/forum/messages[/:messageId]` | Sim | VIEW_ROW |

## Repositorios

- `TableContractRepository` - Acesso a tabela pai e buildTable para colecao dinamica
- `ReactionContractRepository` - CRUD de reacoes (usado em reaction)
- `EvaluationContractRepository` - CRUD de avaliacoes (usado em evaluation)
- `UserContractRepository` - Resolucao de emails para mencoes (usado em forum-message)
- `EmailQueueContractService` - Enfileira notificacao de mencoes (usado em forum-message); worker BullMQ processa async

## Particularidades

- Rows usam colecao dinamica construida via buildTable() a partir do _schema da tabela
- Body de create/update e Record<string, any> (schema dinamico, validado por validateRowPayload)
- Campos PASSWORD sao hasheados antes de salvar e mascarados no retorno
- Populate de campos RELATIONSHIP e USER e construido dinamicamente via buildPopulate
