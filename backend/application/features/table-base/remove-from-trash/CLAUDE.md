# Remove Table from Trash

Restaura uma tabela da lixeira.

## Endpoint
`PATCH /tables/:slug/restore` | Auth: Sim | Permission: UPDATE_TABLE

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_TABLE)
2. Validator: TableRemoveFromTrashParamsValidator - campos: slug (string, trim)
3. UseCase:
   - Busca a tabela na lixeira por slug exato (`findBySlug(slug, { trashed: true })`)
   - Se nao houver na lixeira: 409 NOT_TRASHED se existe uma ativa com esse slug,
     senao 404 TABLE_NOT_FOUND
   - Bloqueia se ja existe uma tabela ativa com o mesmo slug (409 SLUG_ALREADY_ACTIVE) —
     restaurar duplicaria a colecao dinamica (chaveada pelo slug)
   - Atualiza trashed=false e trashedAt=null
   - Retorna tabela atualizada
4. Repository: TableContractRepository.findBySlug, TableContractRepository.update

## Regras de Negocio
- Restaura tabela removendo marcacao de trashed
- Tabela que nao esta na lixeira gera conflito 409
- Slug e a chave da colecao dinamica e precisa ser unico entre tabelas ativas:
  nao restaura se ja ha uma tabela ativa com o mesmo slug

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 409 | NOT_TRASHED | Tabela nao esta na lixeira |
| 409 | SLUG_ALREADY_ACTIVE | Ja existe uma tabela ativa com o mesmo slug |
| 500 | REMOVE_TABLE_FROM_TRASH_ERROR | Erro interno |

## Testes
- Unit: `remove-from-trash.use-case.spec.ts`
- E2E: `remove-from-trash.controller.spec.ts`
