# Evaluation

Adiciona ou atualiza uma avaliacao (nota numerica) do usuario em um campo de avaliacao de um registro.

## Endpoint
`POST /tables/:slug/rows/:_id/evaluation` | Auth: Sim | Permission: UPDATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (UPDATE_ROW)
2. Validator: TableRowEvaluationBodyValidator - campos: value (number), field (string, trim - slug do campo de avaliacao). TableRowEvaluationParamsValidator - campos: slug (string, trim), _id (string, trim). Payload inclui user (de request.user.sub)
3. UseCase:
   - Busca tabela por slug exato
   - Constroi modelo dinamico via buildTable
   - Constroi populate via buildPopulate
   - Busca registro por _id
   - Busca avaliacao existente do usuario via evaluationRepository.findBy
   - Se nao existe: cria nova avaliacao com value e user
   - Se existe: atualiza value da avaliacao existente
   - Verifica se evaluationId ja esta no array do campo no registro
   - Se nao esta: adiciona evaluationId ao array do campo e salva
   - Popula o registro
   - Retorna registro atualizado
4. Repository: TableContractRepository.findBy, EvaluationContractRepository.findBy, EvaluationContractRepository.create, EvaluationContractRepository.update, colecao dinamica via buildTable().findOne, row.set().save()

## Regras de Negocio
- Cada usuario tem uma unica avaliacao por campo (upsert)
- Value e numerico (sem restricao de range no validator)
- EvaluationId e adicionado ao array do campo especificado no registro
- Se usuario ja avaliou, atualiza o valor (nao duplica)

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 404 | ROW_NOT_FOUND | Registro nao encontrado |
| 500 | EVALUATION_ROW_TABLE_ERROR | Erro interno |

## Testes
- Unit: `evaluation.use-case.spec.ts`
- E2E: `evaluation.controller.spec.ts`
