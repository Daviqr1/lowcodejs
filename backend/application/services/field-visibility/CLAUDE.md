# Field Visibility Service

Enforcement server-side da visibilidade de campo por contexto
(`field.permissions: { list, form, detail }`). Decide quais campos NAO nativos
ficam ocultos para o solicitante e remove esses campos das respostas/escritas de
row. Espelha o que o frontend ja faz como dica de UX (`useFieldVisibility`), mas
aqui e a fonte da verdade: impede vazamento do valor (list/detail) e escrita em
campo oculto (form).

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `field-visibility-contract.service.ts` | Classe abstrata + tipos `FieldVisibilityContext` (`list`/`form`/`detail`) e `FieldVisibilityInput` |
| `field-visibility.service.ts` | Implementacao; delega o fecho de grupos ao `GroupResolverContractService` |
| `in-memory-field-visibility.service.ts` | Stub de teste (por padrao nao oculta nada; `setHidden` forca) |

## Metodos

| Metodo | Retorno | Descricao |
|--------|---------|-----------|
| `hiddenSlugs(input)` | `Set<string>` | Slugs dos campos **nao nativos** ocultos no contexto para o usuario. Vazio quando privilegiado |
| `project(target, hidden)` | `T` | Remove de `target` as chaves em `hidden` (usado em rows na resposta e no payload de escrita) |

## Logica de `hiddenSlugs`

1. **Dono/admin da tabela** (`isOwner` ou `isAdministrator`, sinais do `TableAccessMiddleware`) → nada oculto.
2. **Campo nativo** (`field.native`) → nunca oculto (estrutural).
3. **Privilegiado** (`GroupResolverContractService.isPrivileged` — MASTER/ADMINISTRATOR no **fecho de grupos**, não no `role` do JWT) → nada oculto. O usuário é carregado uma vez (`UserContractRepository.findById`) e reusado para o privilégio e para os bindings GROUP.
4. Para cada campo nao nativo, avalia `field.permissions[context]`:
   - sem binding → campo visivel (default)
   - `PUBLIC` → visivel; `NOBODY` → oculto; `GROUP` → **intersecao**: visivel so
     se o grupo do binding estiver no fecho do usuario **E** o fecho de
     capacidades contiver `VIEW_FIELD` (espelha a intersecao das acoes de tabela)

## Onde e aplicado (`table-rows`)

| Use-case | Contexto | Efeito |
|----------|----------|--------|
| `paginated` | `list` | Remove os valores dos campos ocultos de cada row |
| `show` | `detail` | Remove os valores dos campos ocultos da row |
| `create` / `update` | `form` | Descarta do payload escritas em campos ocultos antes de validar/salvar |
| `bulk-update` | `form` | Reusa o `update` (encaminha os sinais do solicitante) |

Os controllers passam os sinais do solicitante via chaves reservadas `__isOwner`
e `__isAdministrator` (descartadas pelo Mongoose strict, como
`__ownOnly`/`__actorUserId`). Em leitura (`paginated`/`show`) sao parametros
normais do payload do use-case. O privilégio MASTER/ADMINISTRATOR **não** é mais
passado pelo controller (era `__role`/`userRole`): o serviço o resolve pelo fecho
de grupos a partir do `userId`.
