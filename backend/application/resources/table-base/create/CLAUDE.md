# Create Table

Cria uma nova tabela dinamica com campos nativos e campo "Nome" padrao.

## Endpoint
`POST /tables` | Auth: Sim | Permission: CREATE_TABLE

## Fluxo
1. Middleware: AuthenticationMiddleware (required), TableAccessMiddleware (CREATE_TABLE)
2. Validator: TableCreateBodyValidator - campos: name (string, trim, min 1, max 40, regex letras/numeros/espacos/hifen/underscore), logo (string nullable optional), style (TableStyleSchema optional)
3. UseCase:
   - Valida que owner existe no payload
   - Gera slug a partir do nome via slugify
   - Verifica unicidade do slug (findBy exact)
   - Cria campos nativos (FIELD_NATIVE_LIST) + campo "Nome" (TEXT_SHORT, required, `permissions=buildFieldPermissions(true,true,true)`, showInFilter)
   - Gera _schema via buildSchema dos campos nativos
   - Cria tabela com type TABLE, `permissions=buildDefaultTablePermissions(...)` (preset RESTRICTED) e `members=[{ owner, OWNER }]`, default LIST para style
   - Atualiza tabela com IDs dos campos nativos em fields, fieldOrderList e fieldOrderForm
   - Retorna tabela criada com campos populados
4. Repository: TableContractRepository.findBy, TableContractRepository.create, TableContractRepository.update, FieldContractRepository.createMany

## Regras de Negocio
- Owner e obrigatorio (extraido de request.user.sub pelo controller) e gravado em `owner`
- Slug deve ser unico entre tabelas existentes
- Campos nativos sao criados automaticamente junto com o campo "Nome"
- Style padrao: LIST. A tabela ja nasce no modelo novo: `permissions` recebe o
  preset RESTRICTED via `buildDefaultTablePermissions` e o dono entra como membro
  `OWNER` em `members[]`. Nunca nasce com `permissions: null` — nao ha campos
  legados nem fallback.

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 400 | OWNER_REQUIRED | Owner nao fornecido |
| 409 | TABLE_ALREADY_EXISTS | Slug ja existe |
| 500 | CREATE_TABLE_ERROR | Erro interno |

## Testes
- Unit: `create.use-case.spec.ts`
- E2E: `create.controller.spec.ts`
