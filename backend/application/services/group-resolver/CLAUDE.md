# Group Resolver Service

Resolve o **fecho de grupos** de um usuario e as capacidades/privilegios
derivados. Fonte unica do RBAC novo (grupos custom + `encompasses` + capacidades)
— substitui as comparacoes espalhadas `role === MASTER/ADMIN`. Ver
`backend/CLAUDE.md` § Sistema de Permissoes.

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `group-resolver-contract.service.ts` | Abstract class |
| `group-resolver.service.ts` | Impl (`@Service() export default`) |
| `group-resolver.service.spec.ts` | Unit tests |

## Contrato

```typescript
resolveUserGroupIds(user): Promise<Set<string>>   // fecho transitivo {group} ∪ groups (encompasses)
resolveCapabilities(user): Promise<Set<string>>   // uniao das E_AREA_CAPABILITY do fecho
isPrivileged(user): Promise<boolean>              // fecho contem MASTER ou ADMINISTRATOR
isMaster(user): Promise<boolean>                  // fecho contem MASTER
shouldHideMaster(user): Promise<boolean>          // esconde o grupo MASTER na listagem
```

## Comportamento Chave

- O fecho segue `encompasses[]` (herda o acesso dos grupos englobados).
- `isPrivileged`/`isMaster` sao a autoridade de bypass (acesso total), usados por
  middlewares (`permission`/`role`), `menu/list`, `pages/show`, permission e
  field-visibility services — nao o `role` do JWT.

DI: registrado pelo scanner.
