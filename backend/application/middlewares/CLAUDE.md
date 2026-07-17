# Middlewares

Middlewares Fastify aplicados via decorator `onRequest` nos controllers.

## `authentication.middleware.ts`

Extrai e valida JWT do request:
1. Extrai o token do cookie `accessToken` via `getRequestCookie` (header `cookie`
   cru ou `request.cookies`). **Nao ha fallback de header `Authorization`**
2. Decodifica via `request.server.jwt.decode` e verifica o tipo (deve ser ACCESS,
   nao REFRESH)
3. Popula `request.user` com `{ sub, email, role, type }` do payload (`IJWTPayload`)
4. Parametro `optional`: se true, retorna sem erro quando o token esta ausente,
   invalido ou nao e ACCESS (user = undefined); senao lanca 401
   AUTHENTICATION_REQUIRED

**Uso:**
```typescript
onRequest: [AuthenticationMiddleware({ optional: false })]
```

## `permission.middleware.ts`

`PermissionMiddleware(capability)` - guarda das **areas do sistema** (Usuarios,
Menu, Grupos, Configuracoes, Ferramentas, Plugins). Substitui o RoleMiddleware:
em vez de exigir um role fixo, exige uma **capacidade de area**
(`E_AREA_CAPABILITY`) atribuivel a qualquer grupo.

1. Exige usuario autenticado
2. MASTER bypassa — resolvido pelo **fecho de grupos** (`GroupResolver.isMaster`),
   nao pelo `role` do JWT (que reflete so o grupo principal)
3. Resolve as capacidades do usuario pelo **fecho de grupos** (grupo principal +
   adicionais + englobados via `encompasses[]`) com o `GroupResolverContractService`
4. Lanca Forbidden se a capacidade nao estiver presente

## `role.middleware.ts`

`RoleMiddleware([MASTER|ADMINISTRATOR])` — guarda por papel de sistema resolvida
pelo **fecho de grupos** (carrega o usuario e usa `GroupResolver.isMaster` /
`isPrivileged`), nao pelo `role` do JWT. `[MASTER]` exige `isMaster`; conjuntos
que incluem ADMINISTRATOR exigem `isPrivileged`. Usado por storage-migration,
setup e o export cross-tabela (`table-base/export-csv`).

**Uso:**
```typescript
onRequest: [
  AuthenticationMiddleware({ optional: false }),
  PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS)
]
```

## `table-access.middleware.ts`

Verifica acesso a tabela. Faz parsing do request e delega ao
`PermissionContractService`:
1. Busca tabela por slug (params) e popula `request.table`
2. Busca usuario autenticado
3. Verifica acesso publico (visitante sem auth) via `isPublicAccess`
4. Verificacao completa via `checkTableAccess`, baseada em:
   - Role do usuario (MASTER bypassa tudo, ADMINISTRATOR tem acesso total)
   - Dono da tabela (`table.owner` ou membro com perfil OWNER)
   - Perfil de membro (`table.members` + `TABLE_PROFILE_MATRIX`) + binding por
     acao (`table.permissions`, PUBLIC/NOBODY/GROUP). Nao ha fallback legado.
5. Popula `request.ownership` (inclui `ownOnly` quando o perfil so permite as
   proprias rows — ex: contributor)

**Parametro `requiredPermission`:** string do `E_TABLE_PERMISSION`

**Excecoes de acesso para visitantes:**
- Acao com binding PUBLIC

**Uso:**
```typescript
onRequest: [
  AuthenticationMiddleware({ optional: true }),
  TableAccessMiddleware({ requiredPermission: E_TABLE_PERMISSION.VIEW_ROW })
]
```

## `extension-active.middleware.ts`

`ExtensionActiveMiddleware({ pkg, type, extensionId })` — blinda rotas
registradas por extensoes. Resolve o `ExtensionContractRepository` via
`getInstanceByToken`, busca a extensao por chave (`findByKey`) e lanca 404
(cause `EXTENSION_NOT_ACTIVE`) se ausente, `enabled === false` ou
`available === false`. Assim uma flag desligada em runtime derruba a rota mesmo
que o controller ja esteja registrado. `type` ∈ `E_EXTENSION_TYPE`
(PLUGIN/MODULE/TOOL).

**Uso:**
```typescript
onRequest: [
  AuthenticationMiddleware({ optional: false }),
  ExtensionActiveMiddleware({ pkg: 'core', type: E_EXTENSION_TYPE.TOOL, extensionId: 'hello' })
]
```
