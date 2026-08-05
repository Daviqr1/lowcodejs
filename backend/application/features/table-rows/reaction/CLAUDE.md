# Reaction

Adiciona ou atualiza uma reacao (like/unlike) do usuario em um campo de reacao de um registro.

## Endpoint
`POST /tables/:slug/rows/:_id/reaction` | Auth: Sim | Permission: UPDATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_ROW)
2. Validator: TableRowReactionBodyValidator - campos: type (enum LIKE/UNLIKE), field (string, trim - slug do campo de reacao). TableRowReactionParamsValidator - campos: slug (string, trim), _id (string, trim). Payload inclui user (de request.user.sub)
3. UseCase:
   - Busca tabela por slug exato
   - Constroi modelo dinamico via buildTable
   - Constroi populate via buildPopulate
   - Busca registro por _id
   - Busca reacao existente do usuario via reactionRepository.findBy
   - Se nao existe: cria nova reacao com type e user
   - Se existe: atualiza type da reacao existente
   - Verifica se reactionId ja esta no array do campo no registro
   - Se nao esta: adiciona reactionId ao array do campo e salva
   - Popula o registro
   - Retorna registro atualizado
4. Repository: TableContractRepository.findBy, ReactionContractRepository.findBy, ReactionContractRepository.create, ReactionContractRepository.update, colecao dinamica via buildTable().findOne, row.set().save()

## Regras de Negocio
- Cada usuario tem uma unica reacao por campo (upsert)
- Tipos de reacao: LIKE ou UNLIKE
- ReactionId e adicionado ao array do campo especificado no registro
- Se usuario ja reagiu, atualiza o tipo (nao duplica)

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | ROW_NOT_FOUND | Registro nao encontrado |
| 500 | REACTION_ROW_TABLE_ERROR | Erro interno |

## Testes
- Unit: `reaction.use-case.spec.ts`
- E2E: `reaction.controller.spec.ts`
