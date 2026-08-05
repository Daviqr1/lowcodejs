# Create Row

Cria um novo registro (row) em uma tabela dinamica.

## Endpoint
`POST /tables/:slug/rows` | Auth: Opcional | Permission: CREATE_ROW

## Fluxo
1. Middleware: AuthenticationMiddleware (optional), TableAccessMiddleware (CREATE_ROW)
2. Validator: TableRowCreateParamsValidator - campos: slug (string, trim). Body e Record<string, union(string, number, boolean, null, array)> - schema dinamico
3. UseCase:
   - Busca tabela por slug exato
   - Valida payload contra campos da tabela via validateRowPayload (validacao de tipos, required, formatos)
   - Hash de campos PASSWORD via hashPasswordFields
   - Constroi modelo dinamico via buildTable
   - Constroi populate para campos RELATIONSHIP/USER via buildPopulate
   - Cria registro na colecao dinamica (creator = user.sub ou null)
   - Popula o registro criado
   - Mascara campos PASSWORD no retorno
   - Retorna registro com _id como string
4. Repository: TableContractRepository.findBy, colecao dinamica via buildTable().create

## Regras de Negocio
- Auth opcional permite criacao em tabelas FORM/OPEN sem autenticacao
- Body e dinamico, validado em runtime contra a definicao dos campos da tabela
- Campos PASSWORD sao hasheados (bcrypt) antes de persistir e mascarados no retorno
- Creator e populado a partir de request.user.sub quando autenticado

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404 | TABLE_NOT_FOUND | Tabela nao encontrada |
| 400 | INVALID_PAYLOAD_FORMAT | Validacao de campos falhou (retorna errors detalhados) |
| 500 | CREATE_ROW_ERROR | Erro interno |

## Testes
- Unit: `create.use-case.spec.ts`
- E2E: `create.controller.spec.ts`
