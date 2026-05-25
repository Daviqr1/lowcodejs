# Plugin: Acesso ao Próprio Criador

Plugin **permissivo** que concede acesso de leitura e escrita ao criador de um
registro, mesmo que outros guards (ex: `visibility-by-role`) normalmente
bloqueariam o acesso.

## Quando usar

Ideal quando combinado com guards restritivos. Exemplo típico: ativar
`visibility-by-role` + `creator-bypass` na mesma tabela. O resultado:

| Role | Vê rows PUBLIC | Vê rows SIGILOSAS | Vê próprias rows (qualquer visibility) |
|------|---------------|-------------------|----------------------------------------|
| MASTER | ✓ | ✓ | ✓ |
| ADMINISTRATOR | ✓ | ✓ | ✓ |
| MANAGER | ✓ | ✗ | ✓ |
| REGISTERED | ✓ | ✗ | ✓ |

O admin bypass é aplicado **globalmente** pelo `RowAccessGuardService` — este
plugin nunca recebe MASTER ou ADMINISTRATOR como `user?.role`.

## Comportamento por operação

| Operação | Criador da row | Não-criador |
|----------|---------------|-------------|
| Listar rows | Sub-query `{creator: user.sub}` via `$or` | Filtros dos outros guards |
| GET row por ID | `allow` (bypass) | `abstain` (outros guards decidem) |
| Criar row | `abstain` (não há row; outros guards decidem) | `abstain` |
| Atualizar row própria | `allow` (bypass) | `abstain` |
| Atualizar row alheia | `abstain` | `abstain` |
| Deletar row própria | `allow` (bypass) | `abstain` |
| Deletar row alheia | `abstain` | `abstain` |

### Semantica de composição (permissive)

O `RowAccessGuardService` usa a regra `allow > deny > abstain`. Ao emitir
`'allow'`, este plugin faz **escape** do `deny` que guards restrictive emitiriam.
Quando retorna `'abstain'`, os outros guards continuam decidindo normalmente.

### Defense-in-depth: sanitize não é bypassed

O `sanitizeWritePayload` de guards restrictive ainda é chamado mesmo quando
este plugin emitiu `allow` em `canWrite`. Isso significa: o criador pode editar
sua própria row SIGILOSA, mas **não pode mudar** o campo `visibility` para
SIGILOSO se o `visibility-by-role` estiver ativo (o sanitize reverte para o
valor atual da row). A permissão de escrita não bypassa a sanitização.

## Configuração

**Sem settings** — nenhuma configuração por tabela. O campo `creator` é nativo
de todas as tabelas do LowCodeJS.

**`supportsScopeAll: true`** — pode ser aplicado a todas as tabelas
simultaneamente (modo "Todas as tabelas" habilitado no Workshop).

## Dependências

Sem DI deps. O campo `creator` é populado automaticamente pelo use-case de
create em todas as collections dinâmicas.

## Registro

O guard é registrado em `RowAccessGuardService` pela chave `core:creator-bypass`.
O registro é feito em `row-access-guard.service.ts` pelo orchestrador — este
arquivo não executa `RowAccessGuardService.register(...)` diretamente.

## Performance

`adjustListQuery` contribui com `{ creator: user.sub }` ao fragmento `$or`
permissivo. O `RowAccessGuardService` monta a query final como:

```
{ $or: [ <restricive AND filters>, { ...baseQuery, creator: user.sub } ] }
```

Isso força um sub-scan por `creator` em cada listagem. **Recomenda-se criar
índice `{ creator: 1 }` na coleção** para garantir uso de index scan:

```js
db.getCollection('<table-slug>').createIndex({ creator: 1 });
```

O plugin `date-window-guard` (modo `field-range`) cria índices automaticamente
no `onTableBound`. Se apenas `creator-bypass` estiver ativo, considere criar o
índice manualmente ou via migration dedicada.
