# Plugin: Janela Temporal (date-window-guard)

Restringe a visibilidade de rows por janela temporal. Três modos configuráveis por tabela.

## Modos

### `createdAt-sliding` — Últimos N dias

Exibe apenas rows criadas nos últimos `slidingDays` dias. Útil para feeds de
atividade recente, dashboards de operação e alertas.

**Quando usar:** "Quero que usuários só vejam ocorrências dos últimos 30 dias"

**Configuração:**
```json
{ "mode": "createdAt-sliding", "slidingDays": 30 }
```

**Query gerada:**
```js
{ createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }
```

---

### `createdAt-fixed` — Intervalo fixo de datas

Exibe apenas rows cujo `createdAt` cai dentro de um intervalo estático
`[fixedFrom, fixedTo]`. Ambas as pontas são opcionais (null = sem limite naquele
lado). Útil para ciclos fechados: "dados do exercício fiscal 2024".

**Quando usar:** "Campanha de cadastro válida de 01/01 até 31/12/2025"

**Configuração:**
```json
{
  "mode": "createdAt-fixed",
  "fixedFrom": "2025-01-01T00:00:00.000Z",
  "fixedTo": "2025-12-31T23:59:59.000Z"
}
```

Se `fixedFrom` e `fixedTo` forem ambos `null`, o filtro é omitido (sentinel
`{}`) — nenhuma row é bloqueada nesse modo.

---

### `field-range` — Vigência via campos da row

Lê dois campos DATE da própria row (`validFromSlug` e `validUntilSlug`) e exibe
a row apenas quando o instante atual cai dentro do intervalo `[valid_from, valid_until]`.
Ideal para contratos, ofertas, publicações programadas.

**Quando usar:** "Cada row tem data de inicio e fim de vigência; exibir apenas rows ativas"

**Configuração:**
```json
{
  "mode": "field-range",
  "validFromSlug": "valid_from",
  "validUntilSlug": "valid_until"
}
```

**Efeito automático em `onTableBound`:** cria os campos DATE `valid_from`
("Válido a partir de") e `valid_until` ("Válido até") na tabela, se ainda não
existirem. Se os slugs já existirem com tipo diferente de DATE, o bind falha
com `409 ROW_GUARD_FIELD_INCOMPATIBLE`.

---

## Comportamento

| Papel | Comportamento |
|-------|---------------|
| MASTER | Vê todas as rows (bypass global, aplicado no service) |
| ADMINISTRATOR | Vê todas as rows (bypass global) |
| MANAGER / REGISTERED | Vê apenas rows dentro da janela temporal configurada |

O guard é **restrictive** e **nunca emite `allow`**. Apenas `abstain` (dentro
da janela — não interfere) ou `deny` (fora da janela — nega acesso).

O `canWrite` retorna sempre `{ decision: 'abstain' }` — este guard não
restringe criação, edição ou exclusão, somente visibilidade de leitura.

`sanitizeWritePayload` é identity — não muta payloads.

---

## Configurar via Workshop (T07)

1. Como MASTER, abra `/extensions`
2. Ative o plugin "Janela Temporal"
3. Clique "Configurar" e selecione as tabelas no escopo
4. Em "Configurações por tabela", escolha o modo e preencha os parâmetros
5. Salve — o plugin cria campos automaticamente (modo `field-range`) e começa
   a filtrar imediatamente

`supportsScopeAll: true` — pode ser aplicado a todas as tabelas de uma vez.

---

## DI — Dependências necessárias

O guard usa dependency injection manual (padrão do plugin `visibility-by-role`).
Em `bin/server.ts`, após o DI registry estar pronto:

```ts
import { injectDateWindowGuardDeps } from '@extensions/core/plugins/date-window-guard/guard';

injectDateWindowGuardDeps({
  fieldRepo: getInstanceByToken(FieldContractRepository),
  tableRepo: getInstanceByToken(TableContractRepository),
  tableSchemaService: getInstanceByToken(TableSchemaContractService),
});
```

As deps são usadas **apenas no modo `field-range`** durante `onTableBound`.
Os modos `createdAt-*` são stateless e não precisam de DI.

---

## Performance

### Modos `createdAt-*`

`createdAt` é campo nativo do MongoDB com índice padrão em coleções dinâmicas
do LowCodeJS. Queries de range em `createdAt` aproveitam o índice existente.

Para tabelas com 100k+ rows recomenda-se confirmar o índice:

```js
db['sua-colecao'].getIndexes()  // deve listar { createdAt: 1 }
```

Se o índice não existir, criar via migration idempotente (padrão
`migrate-add-visibility-index.ts`).

### Modo `field-range`

**TODO (performance):** `onTableBound` atualmente não cria índices nos campos
`validFromSlug` / `validUntilSlug`. Em tabelas com 100k+ rows, a query
`{ valid_from: { $lte: now }, valid_until: { $gte: now } }` fará COLLSCAN.

Para criar os índices manualmente enquanto a migration não existe:

```js
db['sua-colecao'].createIndex({ valid_from: 1, valid_until: 1 })
```

A criação automática de índices via migration idempotente está prevista para
uma iteração futura (após T09 do plano `groovy-bubbling-reef`).

---

## Arquitetura

- **Manifest:** `manifest.json` declara `placement.kind: "row-access-guard"`
- **Implementação:** `guard.ts` exporta `DateWindowGuard` que implementa
  `RowAccessGuard` (em `backend/application/core/extensions/row-access-guard.contract.ts`)
- **Settings schema:** `settings-schema.ts` exporta `dateWindowSettingsSchema`
  (Zod `discriminatedUnion` por `mode`)
- **Registro:** `RowAccessGuardService.register('core:date-window-guard', DateWindowGuard)`
  em `row-access-guard.service.ts`
- **DI:** `injectDateWindowGuardDeps(...)` chamado em `bin/server.ts`

Plano de implementação: `_docs` seção 5 de `groovy-bubbling-reef.md`
