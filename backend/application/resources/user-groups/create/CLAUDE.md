# Create User Group

Cria um novo grupo de usuarios com nome, descricao e permissoes.

## Endpoint
`POST /user-group` | Auth: Yes | Permission: MANAGE_USER_GROUPS

## Fluxo
1. Middleware: `AuthenticationMiddleware({ optional: false })` seguido de `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS)`
2. Validator: `UserGroupCreateBodyValidator` - campos: name (string, required, trim, min 1), description (string, trim, nullable), permissions (array de strings, min 1)
3. UseCase: `UserGroupCreateUseCase`
   - Gera slug a partir do name via `slugify(name, { trim: true, lower: true })`
   - Busca grupo por slug exato no repositorio
   - Se ja existe, retorna 409 CONFLICT
   - Valida que permissions tem ao menos 1 item
   - Cria grupo com payload + slug
   - Retorna grupo criado
4. Repository: `UserGroupContractRepository` - `findBy({ slug, exact: true })`, `create()`

## Regras de Negocio
- Slug gerado automaticamente a partir do nome (lowercase, trim)
- Unicidade por slug (nao por name diretamente)
- Ao menos uma permissao e obrigatoria (validacao no use-case)
- Description pode ser null

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 400 | - | Nenhuma permissao informada (permissions vazio ou ausente) |
| 401 | AUTHENTICATION_REQUIRED | Token JWT ausente ou invalido |
| 409 | GROUP_EXISTS | Ja existe grupo com mesmo slug |
| 500 | CREATE_USER_GROUP_ERROR | Erro interno (banco, etc) |

## Testes
- Unit: `create.use-case.spec.ts`
- E2E: `create.controller.spec.ts`
