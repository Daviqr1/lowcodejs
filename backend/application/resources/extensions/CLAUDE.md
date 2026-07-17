# Extensions (REST)

Recurso REST para gerenciar extensões registradas no DB. **Apenas administra**
o registry — não executa as extensões em si (isso fica no loader, slots e
rotas dinâmicas).

## Base Route

`/extensions`

## Operações

| Operação | Método | Rota | Permissão |
|----------|--------|------|-----------|
| list | GET | `/extensions` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_TOOLS)` |
| active | GET | `/extensions/active` | Auth only (qualquer usuário) |
| toggle | PATCH | `/extensions/:_id/toggle` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_TOOLS)` |
| configure-table-scope | PATCH | `/extensions/:_id/table-scope` | `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_PLUGINS)` |

## Middlewares

`AuthenticationMiddleware({ optional: false })` roda primeiro em todas as
operações. A camada de autorização é por **capacidade de área**
(`PermissionMiddleware`), não mais por role:

- **list** e **toggle**: `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_TOOLS)`
- **configure-table-scope**:
  `PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_PLUGINS)`
- **active**: AUTH-ONLY (sem PermissionMiddleware) — guarda de runtime para
  qualquer usuário autenticado

> Isto **restringe** o acesso em relação ao modelo antigo
> (`RoleMiddleware([E_ROLE.MASTER, E_ROLE.ADMINISTRATOR])`): ADMINISTRATOR não
> gerencia mais ferramentas/plugins por padrão — somente quem tiver a capacidade
> MANAGE_TOOLS / MANAGE_PLUGINS atribuída ao seu grupo (MASTER bypassa).

## Repositórios utilizados

- `ExtensionContractRepository` — CRUD do registry

## Comportamentos chave

- **list** retorna todas as extensões (incluindo `enabled: false` e
  `available: false`) para o Workshop. Restrito a quem tem a capacidade
  MANAGE_TOOLS (MASTER bypassa)
- **active** retorna apenas extensões `enabled: true` e `available: true`,
  **sem** `manifestSnapshot`. Disponível para qualquer usuário autenticado —
  usado pela sidebar (sub-menu Ferramentas) e pelos slots no frontend
- **toggle** rejeita habilitar uma extensão `available: false` (o manifesto
  sumiu do disco) com `EXTENSION_UNAVAILABLE`
- **configure-table-scope** só aceita extensões do tipo `PLUGIN` —
  `TABLE_SCOPE_NOT_APPLICABLE` em outros tipos. Quando `mode=specific`, exige
  ao menos um tableId

## Observações

- Não há endpoint `create` ou `delete`: o registry é populado exclusivamente
  pelo loader no boot, lendo `backend/extensions/`
- O campo `available` é mantido pelo loader (não pelos endpoints): manifestos
  removidos do disco viram `available: false` no próximo boot
