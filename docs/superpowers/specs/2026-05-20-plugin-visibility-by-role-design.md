# Plugin: Visibilidade por Papel — Design

> **ERRATA (2026-05-20):** O spec original assumia que rows do mongo eram
> nested sob `data.*` (ex: `data.visibility`). Descoberta na implementação:
> `IRow = Merge<Base, Record<string, unknown>>` é FLAT, e o `buildTable` do
> mongoose também — `model.create(payload.data)` espalha os campos no
> top-level do documento. Onde o spec menciona `data.visibility` ou
> `data.${slug}`, leia como `visibility` ou `${slug}` (top-level). Não
> aplica-se à propriedade `tableId` (essa É top-level mesmo). Aplicado nos
> commits `8d1a7b08` (guard+mongoose) e válido para o índice da Task 15
> (deve ser `{tableId: 1, visibility: 1}`).

> Spec da feature solicitada pelo cliente: plugin que filtra registros de uma
> tabela conforme o papel (role) do usuário logado, ocultando registros
> marcados como "Sigiloso" para usuários não-administradores.
>
> Pré-requisito: módulo de Extensões (Luan, branch `feat/extensions`, commit
> `ddc085cb`, Fase 1 entregue). Este plugin é o **primeiro plugin de fato** a
> usar a infra.

## 1. Visão de produto

O cliente pediu:

> "Extensão do tipo plugin que modifica a filtragem dos registros da tabela
> conforme o grupo de usuários. O registro deve ter um campo do tipo Dropdown
> com as opções Público e Sigiloso. Os registros Sigilosos só mostram para
> usuários Administrator e Master. Verificar o grupo de usuário do usuário
> logado e aplicar o filtro. Esse plugin de filtro em sua configuração deve
> ser vinculado à tabela em que deve atuar."

Em uma frase: **MASTER vincula o plugin a uma tabela; a partir daí, registros
marcados como "Sigiloso" só aparecem para ADMIN e MASTER**.

## 2. Decisões fechadas

| # | Decisão | Notas |
|---|---|---|
| 1 | **Regra fixa por role**: só ADMIN + MASTER veem Sigiloso | Sem configuração extra por instância. MANAGER e REGISTERED nunca veem. |
| 2 | **Plugin auto-cria Field regular** na tabela ao bindar | Field tipo DROPDOWN, slug fixo `visibility`, label "Visibilidade", opções `Público` / `Sigiloso`. |
| 3 | **Só ADMIN+MASTER podem marcar Sigiloso** | Não-admin tem o field desabilitado no form e backend rejeita writes. |
| 4 | **Acesso direto a Sigiloso por não-admin retorna 403** | Não 404. Cliente escolheu transparência sobre obfuscação. |
| 5 | **Filtro cobre: List, Get-by-id, Update, Delete, Count, Create** | Não-admin: invisível em leitura, bloqueado em escrita, forçado a PUBLIC em create. |
| 6 | **Backfill no bind: rows existentes viram PUBLIC** | Princípio do menor susto: nada some quando o plugin liga. |
| 7 | **Desvincular preserva field e dados** | Reversibilidade total. Field continua na tabela como dropdown comum; filtro deixa de aplicar. |
| 8 | **Plugin não suporta `tableScope.mode = "all"`** | Auto-criação em todas as tabelas é cara demais. UI desabilita o radio para esse plugin. |
| 9 | **Arquitetura: service centralizado (RowAccessGuard) com switch por pluginKey** | Caminho intermediário entre hardcode espalhado e registry genérico de hooks. |
| 10 | **Plugin vive em `backend/extensions/core/plugins/visibility-by-role/`** | Pacote `core`, shipado junto da plataforma. |

## 3. Arquitetura

### 3.1 Camadas

```
backend/
├── extensions/core/plugins/visibility-by-role/    [NOVO]
│   ├── manifest.json                              # type=PLUGIN, kind=row-access-guard
│   └── guard.ts                                   # implementa RowAccessGuard
│
├── application/core/extensions/
│   ├── manifest.schema.ts                         [MODIFICA]  # +placement.kind="row-access-guard"
│   ├── row-access-guard.contract.ts               [NOVO]      # interface RowAccessGuard
│   └── row-access-guard.service.ts                [NOVO]      # único ponto de acoplamento
│
├── application/resources/extensions/configure-table-scope/
│   └── configure-table-scope.use-case.ts          [MODIFICA]  # invoca onTableBound após salvar
│
└── application/resources/tables/$slug/row/{list,show,update,delete,create,count}/
    └── ...use-case.ts                             [MODIFICA]  # invoca RowAccessGuardService

frontend/
└── src/routes/_private/tables/$slug/row/.../
    └── -row-form.tsx                              [MODIFICA]  # desabilita Visibilidade para não-admin
```

### 3.2 Contrato `RowAccessGuard`

```ts
interface RowAccessGuard {
  pluginKey: string;                    // ex: "core:visibility-by-role"
  supportsScopeAll: boolean;            // false para este plugin

  // chamado no bind. Either pra reportar conflito.
  // wasCreated=true indica que o guard criou recurso novo (field), permitindo
  // compensação pela use-case se outro bind do batch falhar.
  onTableBound(table: ITable): Promise<Either<HTTPException, { wasCreated: boolean }>>;
  onTableUnbound?(table: ITable): Promise<void>;  // opcional — para este plugin é noop

  // chamado em list e count. Devolve query mutada.
  adjustListQuery(query: MongoQuery, user: IUser, table: ITable): MongoQuery;

  // chamado em show/update/delete antes de operar.
  canRead(row: IRow, user: IUser, table: ITable): boolean;

  // chamado em update/delete antes de operar.
  canWrite(
    row: IRow | null,
    user: IUser,
    table: ITable,
    payload?: object,
    operation?: 'create' | 'update' | 'delete'
  ): { allowed: boolean; reason?: string };

  // chamado em create/update para forçar valores.
  sanitizeWritePayload(
    payload: object,
    user: IUser,
    table: ITable,
    operation: 'create' | 'update',
    currentRow?: IRow
  ): object;
}
```

### 3.3 `RowAccessGuardService`

Único arquivo do core que conhece os plugins por id:

```ts
import { VisibilityByRoleGuard } from '@/extensions/core/plugins/visibility-by-role/guard';

const GUARDS: Record<string, RowAccessGuard> = {
  'core:visibility-by-role': VisibilityByRoleGuard,
};

async function getActiveGuardsFor(tableId: ObjectId): Promise<RowAccessGuard[]> {
  const extensions = await extensionRepo.findActiveForTable(tableId);
  return extensions
    .map(e => GUARDS[`${e.pkg}:${e.extensionId}`])
    .filter(Boolean);
}
```

Row use-cases consultam `getActiveGuardsFor` e aplicam todos os guards em
ordem. Defensivo: pluginKey desconhecido é ignorado silenciosamente.

### 3.4 Implementação do `VisibilityByRoleGuard`

```ts
const ADMIN_ROLES = ['MASTER', 'ADMINISTRATOR'];
const VISIBILITY_FIELD_SLUG = 'visibility';
const VISIBILITY_OPTIONS = ['PUBLIC', 'SIGILOSO'];

export const VisibilityByRoleGuard: RowAccessGuard = {
  pluginKey: 'core:visibility-by-role',
  supportsScopeAll: false,

  async onTableBound(table) {
    const existing = table.fields.find(f => f.slug === VISIBILITY_FIELD_SLUG);
    if (existing) {
      if (existing.type !== 'DROPDOWN' ||
          !sameOptions(existing.options, VISIBILITY_OPTIONS)) {
        return left(new GuardBindConflictException(
          `Tabela já possui campo "${VISIBILITY_FIELD_SLUG}" incompatível`
        ));
      }
      // já existe e é compatível: skip create
    let wasCreated = false;
    if (!existing) {
      await fieldRepo.create({
        tableId: table._id,
        slug: VISIBILITY_FIELD_SLUG,
        label: 'Visibilidade',
        type: 'DROPDOWN',
        options: [
          { value: 'PUBLIC', label: 'Público' },
          { value: 'SIGILOSO', label: 'Sigiloso' },
        ],
        required: false,
      });
      wasCreated = true;
    }

    // backfill idempotente: rows sem visibility recebem PUBLIC
    await rowRepo.updateMany(
      { tableId: table._id, 'data.visibility': { $exists: false } },
      { $set: { 'data.visibility': 'PUBLIC' } }
    );

    return right({ wasCreated });
  },

  adjustListQuery(query, user, _table) {
    if (ADMIN_ROLES.includes(user.role)) return query;
    return { ...query, 'data.visibility': 'PUBLIC' };
  },

  canRead(row, user, _table) {
    if (ADMIN_ROLES.includes(user.role)) return true;
    return row.data?.visibility === 'PUBLIC';
  },

  canWrite(_row, user, _table, payload, _operation) {
    if (ADMIN_ROLES.includes(user.role)) return { allowed: true };

    // não-admin tentando marcar SIGILOSO
    if (payload?.visibility === 'SIGILOSO') {
      return { allowed: false, reason: 'Sem permissão para marcar Sigiloso' };
    }

    // não precisa checar row já SIGILOSO aqui: canRead roda antes em update/delete
    // e rejeita 403 antes de canWrite ser chamado.
    return { allowed: true };
  },

  sanitizeWritePayload(payload, user, _table, operation, currentRow) {
    if (ADMIN_ROLES.includes(user.role)) return payload;

    if (operation === 'create') {
      return { ...payload, visibility: 'PUBLIC' };
    }
    // update: preserva o valor atual (não permite trocar)
    return { ...payload, visibility: currentRow?.data?.visibility ?? 'PUBLIC' };
  },
};
```

### 3.5 Mudanças nas row use-cases

Padrão aplicado em **list, count, show, create, update, delete**:

```ts
const guards = await rowAccessGuardService.getActiveGuardsFor(table._id);

// list / count:
let query = baseQuery;
for (const g of guards) query = g.adjustListQuery(query, user, table);

// show / update / delete (após findById):
for (const g of guards) {
  if (!g.canRead(row, user, table)) return left(new ForbiddenByGuardException());
}

// update / delete:
for (const g of guards) {
  const check = g.canWrite(row, user, table, payload, operation);
  if (!check.allowed) return left(new GuardWriteRestrictedException(check.reason));
}

// create / update:
let sanitized = payload;
for (const g of guards) {
  sanitized = g.sanitizeWritePayload(sanitized, user, table, operation, row);
}
```

### 3.6 Frontend

Em `-row-form.tsx`:

```tsx
const isVisibilityField = field.slug === 'visibility';
const isBoundToVisibilityPlugin = useExtensionsBoundTo(table._id)
  .some(e => `${e.pkg}:${e.extensionId}` === 'core:visibility-by-role');
const canEditVisibility = ['MASTER', 'ADMINISTRATOR'].includes(user.role);

const disabled = isVisibilityField && isBoundToVisibilityPlugin && !canEditVisibility;
```

`useExtensionsBoundTo(tableId)` é um hook novo (TanStack Query) que consulta
extensões ativas com aquela tabela no scope.

Sheet de configure-table-scope: quando o plugin escolhido tem
`supportsScopeAll: false`, o radio "Todas as tabelas" fica desabilitado com
tooltip explicando.

### 3.7 Exceptions

```ts
class ForbiddenByGuardException extends HTTPException(403, {
  code: 'ROW_ACCESS_DENIED',
  message: 'Sem permissão para acessar este registro',
});

class GuardWriteRestrictedException extends HTTPException(403, {
  code: 'ROW_WRITE_RESTRICTED',
  message: string,  // recebe `reason` do guard
});

class GuardBindConflictException extends HTTPException(409, {
  code: 'PLUGIN_BIND_CONFLICT',
  message: string,
});
```

## 4. Fluxos

### 4.1 Bind

```
MASTER → /extensions → "Configurar" no plugin → seleciona T1, T2 → Salvar
  → PATCH /extensions/:id/table-scope { mode: "specific", tableIds: [T1, T2] }
  → ConfigureTableScopeUseCase:
      diff vs scope anterior → newlyAdded = [T1, T2]
      for each T in newlyAdded:
        result = RowAccessGuardService.onTableBound(plugin, T)
        if left: ROLLBACK toda transação, retorna 409 com mensagem
      salva tableScope
```

Importante: se qualquer `onTableBound` falhar, **toda a operação reverte**.
Sem bind parcial. Estratégia:

1. **Não salva `tableScope`** até que todos os `onTableBound` retornem `right`.
2. Para cada tabela já processada com sucesso, é necessário compensar: deletar
   o Field "Visibilidade" recém-criado (se foi recém-criado pelo guard — o
   guard expõe um sinal `wasCreated` no retorno success pra a use-case saber).
3. O backfill (`data.visibility=PUBLIC` em rows existentes) **não é compensado**
   — é idempotente e inofensivo deixar como está.

Implementação compensatória vive na `ConfigureTableScopeUseCase`, não no
guard. MongoDB transactions só funcionam em replica set, então não dependemos
delas — compensação manual.

### 4.2 Listagem

```
GET /tables/T1/rows?filters=...
  RowListUseCase:
    guards = getActiveGuardsFor(T1._id)
    query = buildBaseQuery(filters)
    for g in guards: query = g.adjustListQuery(query, user, T1)
    return rowRepo.findMany(query)

  → user MANAGER + plugin ativo em T1: query ganha `data.visibility = 'PUBLIC'`
  → user MASTER: query inalterada
  → plugin desligado ou T1 fora do scope: query inalterada
```

### 4.3 Show / Update / Delete

```
GET /tables/T1/rows/<id>
  RowShowUseCase:
    row = rowRepo.findById(id)
    guards = getActiveGuardsFor(T1._id)
    for g in guards:
      if !g.canRead(row, user, T1): return left(403 ROW_ACCESS_DENIED)
    return right(row)

PATCH /tables/T1/rows/<id> body={ data: {...} }
  RowUpdateUseCase:
    row = rowRepo.findById(id)
    guards = ...
    for g in guards:
      if !g.canRead(row, user, T1): left(403)
      check = g.canWrite(row, user, T1, body.data, 'update')
      if !check.allowed: left(403 reason)
    let payload = body.data
    for g in guards: payload = g.sanitizeWritePayload(payload, user, T1, 'update', row)
    return rowRepo.update(id, payload)

DELETE /tables/T1/rows/<id>
  similar a update mas sem payload, operation='delete'
```

### 4.4 Create

```
POST /tables/T1/rows body={ data: {...} }
  RowCreateUseCase:
    guards = getActiveGuardsFor(T1._id)
    // ADMIN/MASTER: payload.visibility preserva o que veio (PUBLIC ou SIGILOSO)
    // não-admin: payload.visibility é forçado para PUBLIC
    let payload = body.data
    for g in guards: payload = g.sanitizeWritePayload(payload, user, T1, 'create')
    return rowRepo.create({ tableId: T1._id, data: payload })
```

### 4.5 Unbind

```
MASTER tira T1 do scope
  → diff: removed = [T1]
  → noop: field e dados permanecem
  → próximas operações em T1: getActiveGuardsFor(T1._id) retorna [] → filtro não aplica
```

## 5. Edge cases

| Caso | Comportamento |
|---|---|
| Tabela tem field slug=`visibility` pré-existente compatível (DROPDOWN com PUBLIC/SIGILOSO) | `onTableBound` faz skip de create. Backfill mesmo assim (`updateManyWhereMissing`). |
| Tabela tem field slug=`visibility` incompatível | `onTableBound` retorna `left(409)`. Bind reverte. |
| Plugin ativado depois desativado mantendo scope | `getActiveGuardsFor` filtra por `enabled=true`. Sem guard ativo. |
| Manifest sumiu (`available=false`) | Repo já trata: extension ignorada. `getActiveGuardsFor` retorna `[]`. |
| Tabela deletada com scope órfão | ID órfão no array. Sem erro: `findActiveForTable(missingId)` retorna `[]`. Limpeza ocasional via job opcional (fora de escopo). |
| Backfill em tabela com milhares de rows | `updateMany` indexada por `tableId`. Aceitável até ~10⁵. Não bloqueia o request. Implementar com timeout maior se preciso. |
| User ADMIN cria Sigiloso depois é rebaixado para MANAGER | Linha continua existindo; ele para de vê-la. Sem migração. |
| Race: MASTER desativa enquanto MANAGER lista | Snapshot do `enabled` no início do request. Sem locking. Inconsistência aceitável (próximo request reflete novo estado). |
| pluginKey desconhecido em `GUARDS` map | Filtrado silenciosamente. Útil pra deploy quando o code do guard ainda não está no bundle. |
| `tableScope.mode = "all"` para esse plugin | UI desabilita o radio. Backend valida: se `supportsScopeAll === false` e payload tem `mode="all"` → 400. |

## 6. Índices

Adicionar via migration:

```js
db.rows.createIndex({ tableId: 1, "data.visibility": 1 });
```

Justificativa: o filtro list mais comum vai ser `tableId + visibility`.

## 7. Testes

### 7.1 Unit (backend/vitest)

- `VisibilityByRoleGuard.canRead` — matriz 4 roles × {PUBLIC, SIGILOSO, undefined} = 12 casos
- `VisibilityByRoleGuard.canWrite` — matriz: 4 roles × payload {sem visibility, PUBLIC, SIGILOSO} × row {PUBLIC, SIGILOSO, null} × operation {create, update, delete}
- `VisibilityByRoleGuard.adjustListQuery` — ADMIN/MASTER preserva; MANAGER/REGISTERED adiciona filtro
- `VisibilityByRoleGuard.sanitizeWritePayload` — non-admin create força PUBLIC; non-admin update preserva valor da row
- `VisibilityByRoleGuard.onTableBound` — field não existe (cria + backfill), existe compatível (skip + backfill), existe incompatível (left), tabela vazia (cria, backfill noop)
- `RowAccessGuardService.getActiveGuardsFor` — extensão ativa+scope inclui tabela → retorna guard; desativada → []; available=false → []; pluginKey desconhecido → ignora; vários plugins ativos → todos retornam

### 7.2 E2E (backend, MongoDB real)

1. MASTER ativa plugin + bind T1 → Field "Visibilidade" criado + todas rows com `visibility=PUBLIC`
2. MASTER cria row SIGILOSO → MANAGER GET /rows: ausente. ADMIN GET /rows: presente
3. MANAGER GET /rows/<sigilosoId> → 403 ROW_ACCESS_DENIED
4. MANAGER PATCH em row PUBLIC com `visibility=SIGILOSO` → 403 ROW_WRITE_RESTRICTED
5. MANAGER PATCH em row PUBLIC sem mexer em visibility → sucesso; valor preservado
6. MANAGER DELETE em row SIGILOSO → 403
7. MANAGER POST nova row com `visibility=SIGILOSO` no body → row criada com PUBLIC
8. MANAGER GET /rows/count → conta só PUBLIC; ADMIN → conta tudo
9. MASTER tira T1 do scope → MANAGER passa a ver Sigiloso; field persiste
10. MASTER toggle off plugin (scope preservado) → MANAGER passa a ver tudo
11. Bind em tabela com field `visibility` incompatível → 409 PLUGIN_BIND_CONFLICT, scope inalterado
12. `mode=all` no payload do configure-table-scope → 400

### 7.3 Frontend (vitest + RTL)

- RowForm como MANAGER em tabela bound → field Visibilidade renderiza disabled
- RowForm como MASTER em tabela bound → field renderiza editável
- RowForm como MANAGER em tabela NÃO bound → field renderiza editável (caso de tabela com `visibility` que não passou pelo plugin)
- Sheet configure-table-scope com plugin `supportsScopeAll=false` → radio "Todas" desabilitado com tooltip

## 8. Não-objetivos (YAGNI)

- **Configuração por role customizada** — fora de escopo. Regra é fixa.
- **Mais opções de visibilidade além de PUBLIC/SIGILOSO** — fora de escopo.
- **Hook registry genérico** — fora de escopo. Service com switch hardcoded é suficiente até aparecer um segundo plugin do mesmo tipo.
- **Filtro em export/streaming de dados** — fora de escopo, mas guards são reutilizáveis caso surja depois.
- **Mode = "all" para esse plugin** — explicitamente bloqueado por design.
- **Notificação visual de que existem records ocultos** — não foi pedido; mostraria existência justamente do que estamos escondendo.

## 9. Plano de entrega (alto nível)

1. **Contratos e infra core** — `RowAccessGuard` interface, `RowAccessGuardService` (com `GUARDS` vazio), exceptions, manifest.schema com novo campo `kind`
2. **Plugin** — `backend/extensions/core/plugins/visibility-by-role/{manifest.json,guard.ts}`, registra no `GUARDS` map
3. **Integração nas row use-cases** — list, count, show, create, update, delete (cada uma é um change isolado, mesma estrutura)
4. **Configure-table-scope hook** — chama `onTableBound` com rollback em erro; validação de `supportsScopeAll`
5. **Migration** — index `{ tableId, "data.visibility" }`
6. **Frontend** — hook `useExtensionsBoundTo`, ajuste em `-row-form.tsx`, sheet de configure desabilita "Todas" condicionalmente
7. **Testes unit + e2e** — conforme §7
8. **Doc** — atualizar `backend/extensions/CLAUDE.md` documentando o tipo `kind="row-access-guard"` e o catálogo de guards

Detalhamento por commit/PR vai pro plano de implementação (writing-plans).

## 10. Integração com a WIP do Luan

Esta feature **depende da branch `feat/extensions` (commit `ddc085cb`)** do
fork. O Luan entregou a Fase 1 (model, REST list/toggle/scope, loader,
Workshop UI) mas não fez merge no upstream. Caminhos:

- **Plano A (recomendado):** rebasear/mergear nossa feature em cima do branch
  do Luan, abrir um único PR no upstream contendo Fase 1 + esse plugin.
  Conversar com Luan antes pra confirmar que a Fase 1 está estável.
- **Plano B:** trabalhar em branch própria assumindo `feat/extensions` como
  base, fazer PR separado pro upstream que dependa do PR do Luan.

A decisão fica fora do escopo da spec — é coordenação de release. O design
funciona em qualquer um dos planos.
