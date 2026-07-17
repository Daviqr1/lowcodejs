# Relacionamentos: N:N Bidirecional, 1:1, Cardinalidade X e Self-referencing

**Data:** 2026-06-26  
**Status:** Aprovado para implementação

---

## Contexto

O sistema de relacionamentos do LowCodeJS já possui infraestrutura robusta no backend: `RelationshipDefinition`, `RelationshipLink`, `E_RELATIONSHIP_CARDINALITY` (1:1/1:N/N:N), `E_RELATIONSHIP_STORAGE` (OWNS_FK/REVERSE/PIVOT), `canLink()` com enforcement de cardinalidade booleana, onDelete, e materialização de campo espelho.

Quatro capacidades estão incompletas ou ausentes:

1. **N:N bidirecional**: campo espelho criado mas sem `formMode='manage'` — aparece como combobox simples, não como card editor editável
2. **1:1 enforcement no autocomplete**: backend bloqueia no save, mas dropdown exibe registros já vinculados
3. **Cardinalidade X**: sem parâmetro `max` numérico — limite atual é apenas booleano (multiple/single)
4. **Self-referencing**: `create-form.tsx` exclui explicitamente a própria tabela na seleção de destino

---

## Feature 1 — N:N Bidirecional (Mirror Field UI)

### Problema raiz

`RelationshipMaterialization.create()` não seta `formMode` no campo espelho. O campo espelho aparece com `formMode` ausente (tratado como `'select'`), renderizando como combobox. O combobox envia IDs no row payload — incompatível com REVERSE/PIVOT storage role.

### Solução

**Backend — `relationship-materialization.service.ts`:**

Derivar `formMode` do mirror field baseado na cardinalidade:

```typescript
const mirrorFormMode = mirrorMultiple && sourceMultiple ? 'manage' : 'select';
```

Passar `formMode: mirrorFormMode` ao criar e ao atualizar o campo espelho.

**Backend — Migration 24** (`24-migrate-relationship-backfill-form-mode.ts`):

Backfill `formMode='manage'` em campos RELATIONSHIP existentes onde:
- `field.multiple === true`
- `field.relationship.mirror.multiple === true`
- `field.relationship.formMode` ausente ou diferente de `'manage'`

Marker: `MIGRATION_RELATIONSHIP_FORM_MODE_AT` no Setting.

**Frontend — `RelationshipRowsInline`:**

Verificar se as chamadas de link/unlink usam `field.relationship.side` ('source' ou 'target') para determinar o parâmetro `side` da link API. Se não, mapear explicitamente:

```typescript
const linkSide = field.relationship.side ?? 'source';
// Passar linkSide ao useRelationshipLinkCreate / useRelationshipLinkDelete
```

### Arquivos backend afetados

- `application/services/relationship/relationship-materialization.service.ts`
- `database/migrations/24-migrate-relationship-backfill-form-mode.ts` (novo)
- `scripts/migrations/24-migrate-relationship-backfill-form-mode.sh` (novo)

### Arquivos frontend afetados

- `src/components/common/dynamic-table/relationship-management/relationship-rows-inline.tsx`

---

## Feature 2 — 1:1 Enforcement no Autocomplete

### Problema raiz

`useRelationshipRowsReadPaginatedInfinite` busca todos os registros da tabela destino sem filtrar os já vinculados. Usuário seleciona um registro, salva, e recebe erro `RELATIONSHIP_TARGET_LIMIT` ou `RELATIONSHIP_SOURCE_LIMIT`.

### Solução

**Backend — endpoint `/tables/:slug/rows/paginated`:**

Novos query params opcionais no validator existente (`paginated.validator.ts`):

```
GET /tables/:slug/rows/paginated?...&excludeLinked=true&relationshipId=<id>&excludeSide=source|target&excludeForRecordId=<id>
```

Lógica no use-case `paginated.use-case.ts`: quando `excludeLinked=true`, busca todos `sourceId` (ou `targetId`) já linkados nessa RelationshipDefinition para o record informado via `RelationshipLinkContractRepository` → exclui da query via `{ _id: { $nin: linkedIds } }`.

**Frontend — `_query-options.ts` (`relationshipRowsInfiniteOptions`):**

Adicionar params opcionais à interface e repassar para a query:

```typescript
interface RelationshipRowsInfiniteParams {
  tableSlug: string;
  fieldSlug: string;
  search?: string;
  perPage?: number;
  excludeLinked?: boolean;
  relationshipId?: string;
  excludeSide?: 'source' | 'target';
  excludeForRecordId?: string;
}
```

**Frontend — `table-row-relationship-field.tsx`:**

Condição para ativar o filtro:
- `!field.multiple` (picker único — source não-multiple)
- OU `!field.relationship.mirror?.multiple` (mirror não-multiple — target não aceita mais de 1)

Quando ativado, passa os novos params ao hook `useRelationshipRowsReadPaginatedInfinite`.

### Arquivos backend afetados

- `application/resources/table-rows/paginated/paginated.validator.ts` — novos query params Zod opcionais
- `application/resources/table-rows/paginated/paginated.use-case.ts` — lógica de exclusão de linked records

### Arquivos frontend afetados

- `src/hooks/tanstack-query/use-relationship-rows-read-paginated-infinite.tsx`
- `src/hooks/tanstack-query/use-relationship-rows-read-paginated.tsx`
- `src/components/common/dynamic-table/table-row/table-row-relationship-field.tsx`

---

## Feature 3 — Cardinalidade X (max numérico)

### Problema raiz

`IFieldConfigurationRelationship` não tem campo `max`. O `canLink()` só respeita `multiple: boolean` — sem limite numérico. Não é possível configurar "máximo 5 fornecedores por produto".

### Solução

**Backend — tipos e model:**

```typescript
// entity.core.ts — IFieldConfigurationRelationship
max?: number  // null/undefined = sem limite

// field.model.ts — relationship sub-schema
max: { type: Number, default: null }
```

**Backend — Zod schemas (create/update de table-fields):**

```typescript
max: z.number().int().positive().optional()
```

**Backend — `canLink()` atualizado** (`relationship.service.ts`):

```typescript
// Lado SOURCE (campo que estamos linkando FROM)
if (sourceField.multiple && sourceField.relationship?.max) {
  const used = await this.linkRepository.count(definition._id, { sourceId });
  if (used >= sourceField.relationship.max) {
    return left(HTTPException.Conflict('Limite de vínculos atingido', 'RELATIONSHIP_SOURCE_LIMIT'));
  }
}

// Lado TARGET (campo não-multiple com max = limita quantos sources podem apontar para o mesmo target)
if (!targetField.multiple && targetField.relationship?.max) {
  const used = await this.linkRepository.count(definition._id, { targetId });
  if (used >= targetField.relationship.max) {
    return left(HTTPException.Conflict('Limite de vínculos atingido', 'RELATIONSHIP_TARGET_LIMIT'));
  }
}
```

**Frontend — form de config:**

Input numérico inteiro opcional abaixo do switch `multiple`. Aparece quando `multiple: true`. Label: "Máximo de vínculos (vazio = ilimitado)".

**Frontend — enforcement no combobox (`table-row-relationship-field.tsx`):**

- Para multiple + max: quando `selectedItems.length >= max`, desabilita botão "Adicionar"
- Contador visual: `${selected.length}/${max} selecionados`

### Arquivos backend afetados

- `application/core/entity.core.ts` — `IFieldConfigurationRelationship`
- `application/model/field.model.ts` — relationship sub-schema
- `application/resources/table-fields/create/create.validator.ts`
- `application/resources/table-fields/update/update.validator.ts`
- `application/services/relationship/relationship.service.ts` — `canLink()`
- Schemas OpenAPI correspondentes (`create.schema.ts`, `update.schema.ts`)

### Arquivos frontend afetados

- `src/lib/interfaces.ts` — `IFieldConfigurationRelationship`
- `src/routes/_private/tables/$slug/field/create/-create-form.tsx`
- `src/routes/_private/tables/$slug/field/$fieldId/-update-form.tsx`
- `src/components/common/dynamic-table/table-row/table-row-relationship-field.tsx`

---

## Feature 4 — Self-referencing (relacionamento com a própria tabela)

### Problema raiz

`create-form.tsx:654` passa `excludeTableSlug={tableSlug}` ao `TableFieldRelationshipTableSelect`, impedindo seleção da própria tabela. Caso de uso: Produtos → Produtos Relacionados, Livros → Livros Relacionados, Funcionários → Funcionário Gestor (hierarquia).

### Solução

**Frontend — `create-form.tsx`:**

Remover `excludeTableSlug={tableSlug}` da linha 654.

Adicionar badge informativo quando `relationship.tableSlug === tableSlug` (própria tabela selecionada):

```tsx
{isSelfRelationship && (
  <Alert variant="default" className="mt-2">
    Relacionamento com a própria tabela — útil para hierarquias e redes.
    Evite cadeias muito longas (profundidade máxima de navegação: 3 níveis).
  </Alert>
)}
```

**Backend — zero mudanças necessárias:**

- `canLink()` já bloqueia `sourceId === targetId` (mesmo registro)
- Populate depth limit 3 já existe em `populate-builder.service.ts`
- `RelationshipMaterialization`: quando `sourceTable === targetTable`, o campo espelho é criado na mesma tabela — `resolveMirrorSlug()` precisa garantir slug único (ex: prefixo `relacionados-` se slug já existe)

**Backend — `resolveMirrorSlug()` (`relationship-materialization.service.ts`):**

Verificar se slug gerado já existe na tabela. Se sim, adicionar sufixo `-relacionados` ou `-espelho` até ser único.

### Arquivos backend afetados

- `application/services/relationship/relationship-materialization.service.ts` — `resolveMirrorSlug()`

### Arquivos frontend afetados

- `src/routes/_private/tables/$slug/field/create/-create-form.tsx` (linha 654)
- `src/routes/_private/tables/$slug/field/$fieldId/-update-form.tsx` (equivalente)

---

## Verificação (como testar)

### Feature 1 — N:N bidirecional

1. Criar campo Fornecedores em Produtos (`multiple: true`, `mirrorMultiple: true`)
2. Verificar: campo Produtos criado em Fornecedores com `formMode='manage'`
3. Abrir um Produto → vincular Fornecedores via card editor → salvar
4. Abrir um Fornecedor → seção Produtos deve mostrar card editor com o vínculo criado
5. De Fornecedores, adicionar outro Produto → verificar que aparece em Produtos também
6. Rodar migration 24 em base existente → campos N:N sem formMode ganham `manage`

### Feature 2 — 1:1 autocomplete

1. Criar campo Empresa em Sedes (`multiple: false`, `mirrorMultiple: false`) → 1:1
2. Vincular Sede A → Empresa X
3. Abrir Sede B → dropdown Empresa não deve mostrar Empresa X
4. Testar com 1:N (`multiple: false` source, `multiple: true` mirror) → target não-multiple também não aparece se vinculado

### Feature 3 — Cardinalidade X

1. Criar campo Fornecedores em Produtos com `multiple: true`, `max: 3`
2. Vincular 3 fornecedores → botão Adicionar desabilitado, contador "3/3"
3. Tentar via API → retorna `RELATIONSHIP_SOURCE_LIMIT` (409)
4. Para N-1 com max no target: vincular mais que `max` sources ao mesmo target → `RELATIONSHIP_TARGET_LIMIT`

### Feature 4 — Self-referencing

1. Abrir form de criação de campo em Produtos
2. Selecionar tabela Produtos como destino → deve ser permitido
3. Badge informativo deve aparecer
4. Criar relacionamento → campo espelho "Produtos Relacionados" criado na mesma tabela com slug único
5. Vincular Produto A → Produto B → Produto B aparece na lista de relacionados de A
6. Garantir que vincular Produto A → Produto A retorna erro `RELATIONSHIP_SELF_LINK`

### Testes automatizados

```bash
cd backend && npm run test:unit   # relationship.service.spec.ts, relationship-materialization.service.spec.ts
cd backend && npm run test:e2e    # table-fields create/update, table-rows create/update com relationship
cd backend && npm run lint
```

---

## Não incluso neste spec

- Mudança de cardinalidade com dados existentes (ex: 1:N → N:N com links reais) — escopo separado
- UI de "reorder" no lado espelho — comportamento atual de dnd-kit já funciona via link API
- Mudança no `onDelete` semântico — não alterado
- Tabela auxiliar pivot para N:N — abordagem FK-inline/PIVOT atual mantida
