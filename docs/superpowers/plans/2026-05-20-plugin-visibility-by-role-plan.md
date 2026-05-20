# Plugin: Visibilidade por Papel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plugin que filtra registros das tabelas vinculadas conforme o role do usuário: ADMIN+MASTER veem registros marcados como `Sigiloso`; MANAGER+REGISTERED só veem `Público`.

**Architecture:** Service centralizado (`RowAccessGuardService`) com switch hardcoded por `pluginKey` — primeira encarnação de "plugin que altera comportamento do core". Cada row use-case (paginated, show, create, update, delete) consulta o service. O plugin auto-cria um Field `Visibilidade` (DROPDOWN com PUBLIC/SIGILOSO) quando vinculado a uma tabela. Spec completa: `docs/superpowers/specs/2026-05-20-plugin-visibility-by-role-design.md`.

**Tech Stack:** Backend: Fastify 5 + fastify-decorators (DI) + Mongoose + Vitest. Frontend: React 19 + TanStack Query + Vitest.

**Branch:** `feat/visibility-by-role-plugin` (já criada, baseada em `origin/feat/extensions` que tem a Fase 1 do Luan).

---

## Resumo dos arquivos

### Backend — Novos
- `backend/application/core/extensions/row-access-guard.contract.ts` (interface)
- `backend/application/core/extensions/row-access-guard.service.ts` (service)
- `backend/extensions/core/plugins/visibility-by-role/manifest.json`
- `backend/extensions/core/plugins/visibility-by-role/guard.ts`
- `backend/database/migrations/migrate-add-visibility-index.ts`

### Backend — Modificados
- `backend/application/core/entity.core.ts` (adicionar enum E_VISIBILITY)
- `backend/application/core/extensions/manifest.schema.ts` (campo `kind`)
- `backend/application/repositories/extension/extension-contract.repository.ts` (método `findActiveForTable`)
- `backend/application/repositories/extension/extension-mongoose.repository.ts`
- `backend/application/repositories/extension/extension-in-memory.repository.ts`
- `backend/application/resources/extensions/configure-table-scope/configure-table-scope.use-case.ts` (chama onTableBound)
- `backend/application/resources/extensions/configure-table-scope/configure-table-scope.validator.ts` (rejeita mode=all se plugin não suporta)
- `backend/application/resources/table-rows/paginated/paginated.use-case.ts`
- `backend/application/resources/table-rows/show/show.use-case.ts`
- `backend/application/resources/table-rows/create/create.use-case.ts`
- `backend/application/resources/table-rows/update/update.use-case.ts`
- `backend/application/resources/table-rows/delete/delete.use-case.ts`
- `backend/application/core/di-registry.ts` (registra RowAccessGuardService)

### Frontend — Novos
- `frontend/src/hooks/tanstack-query/use-extensions-bound-to-table.tsx`

### Frontend — Modificados
- `frontend/src/lib/constant.ts` (enum E_VISIBILITY)
- `frontend/src/routes/_private/tables/$slug/row/create/-create-row-form.tsx` (desabilita campo visibility)
- `frontend/src/routes/_private/tables/$slug/row/$rowId/-update-row-form.tsx` (idem)
- `frontend/src/routes/_private/extensions/index.lazy.tsx` (desabilita radio "Todas as tabelas" quando supportsScopeAll=false)

### Docs
- `backend/extensions/CLAUDE.md` (documenta `kind="row-access-guard"`)
- `backend/extensions/core/plugins/visibility-by-role/README.md`

---

## Task 1: Adicionar enum `E_VISIBILITY` no entity.core

**Files:**
- Modify: `backend/application/core/entity.core.ts`

Cria o enum compartilhado pra valores de visibilidade. Vive em `entity.core.ts` junto com os outros enums do projeto.

- [ ] **Step 1: Adicionar o enum**

Abrir `backend/application/core/entity.core.ts`, procurar a região onde outros `E_*` enums vivem (perto de `E_EXTENSION_TYPE` por ex.) e adicionar:

```ts
export const E_VISIBILITY = {
  PUBLIC: 'PUBLIC',
  SIGILOSO: 'SIGILOSO',
} as const;

export type E_VISIBILITY = ValueOf<typeof E_VISIBILITY>;
```

- [ ] **Step 2: Verificar tipos**

Run: `cd backend && npx tsc --noEmit 2>&1 | head -10`
Expected: no errors related to entity.core.ts.

- [ ] **Step 3: Commit**

```bash
git add backend/application/core/entity.core.ts
git commit -m "feat(core): adicionar enum E_VISIBILITY (PUBLIC/SIGILOSO)"
```

---

## Task 2: Adicionar campo `kind` no manifest schema

**Files:**
- Modify: `backend/application/core/extensions/manifest.schema.ts`
- Test: `backend/application/core/extensions/manifest.schema.spec.ts` (novo)

Plugins de "row-access-guard" precisam declarar isso no manifest. Schema atual só aceita `placement.slot`.

- [ ] **Step 1: Escrever o teste falhando**

Criar `backend/application/core/extensions/manifest.schema.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';

import { ManifestSchema } from './manifest.schema';

describe('ManifestSchema', () => {
  it('aceita placement.kind = "row-access-guard" para plugins sem slot', () => {
    const result = ManifestSchema.safeParse({
      id: 'visibility-by-role',
      type: 'PLUGIN',
      name: 'Visibilidade por Papel',
      version: '1.0.0',
      placement: { kind: 'row-access-guard' },
    });
    expect(result.success).toBe(true);
  });

  it('aceita placement com slot ou kind', () => {
    const withSlot = ManifestSchema.safeParse({
      id: 'export-pdf',
      type: 'PLUGIN',
      name: 'Exportar',
      version: '1.0.0',
      placement: { slot: 'table.actions' },
    });
    expect(withSlot.success).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar o teste — falha esperada**

Run: `cd backend && npx vitest run application/core/extensions/manifest.schema.spec.ts`
Expected: FAIL — `placement.kind` não é aceito (schema atual é strict() só com `slot`).

- [ ] **Step 3: Atualizar o schema**

Em `backend/application/core/extensions/manifest.schema.ts`, substituir o `ManifestPlacementSchema`:

```ts
export const ManifestPlacementSchema = z
  .object({
    slot: z.string().min(1).optional(),
    kind: z.enum(['row-access-guard']).optional(),
  })
  .strict()
  .refine((p) => p.slot || p.kind, {
    message: 'placement deve ter slot ou kind',
  })
  .optional();
```

- [ ] **Step 4: Rodar de novo — esperado passar**

Run: `cd backend && npx vitest run application/core/extensions/manifest.schema.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/application/core/extensions/manifest.schema.ts backend/application/core/extensions/manifest.schema.spec.ts
git commit -m "feat(extensions): permitir placement.kind=row-access-guard no manifest"
```

---

## Task 3: Definir interface `RowAccessGuard`

**Files:**
- Create: `backend/application/core/extensions/row-access-guard.contract.ts`

Sem teste — é só tipos/interface.

- [ ] **Step 1: Criar o arquivo**

```ts
/* eslint-disable no-unused-vars */
import type { Either } from '@application/core/either.core';
import type {
  IRow,
  ITable,
  IUser,
} from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';

export type GuardOperation = 'create' | 'update' | 'delete';

export type GuardWriteCheck =
  | { allowed: true }
  | { allowed: false; reason: string };

export type GuardBindResult = { wasCreated: boolean };

export abstract class RowAccessGuard {
  /** ex: "core:visibility-by-role" */
  abstract pluginKey: string;

  /** Se false, mode="all" do tableScope é proibido para este plugin. */
  abstract supportsScopeAll: boolean;

  /** Roda quando o plugin é vinculado a uma tabela. Pode falhar (Either.left). */
  abstract onTableBound(
    table: ITable,
  ): Promise<Either<HTTPException, GuardBindResult>>;

  /** Roda quando o plugin é desvinculado. Opcional. */
  onTableUnbound?(table: ITable): Promise<void>;

  /** Modifica a query mongo de listagem (paginated). */
  abstract adjustListQuery(
    query: Record<string, unknown>,
    user: IUser | undefined,
    table: ITable,
  ): Record<string, unknown>;

  /** Decide se user pode ler uma row específica. */
  abstract canRead(row: IRow, user: IUser | undefined, table: ITable): boolean;

  /** Decide se user pode escrever (create/update/delete). */
  abstract canWrite(
    row: IRow | null,
    user: IUser | undefined,
    table: ITable,
    payload: Record<string, unknown> | null,
    operation: GuardOperation,
  ): GuardWriteCheck;

  /** Ajusta o payload antes de salvar (força PUBLIC pra não-admin). */
  abstract sanitizeWritePayload(
    payload: Record<string, unknown>,
    user: IUser | undefined,
    table: ITable,
    operation: 'create' | 'update',
    currentRow: IRow | null,
  ): Record<string, unknown>;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd backend && npx tsc --noEmit 2>&1 | head -10`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/application/core/extensions/row-access-guard.contract.ts
git commit -m "feat(extensions): contrato RowAccessGuard"
```

---

## Task 4: Adicionar `findActiveForTable` no ExtensionContractRepository

**Files:**
- Modify: `backend/application/repositories/extension/extension-contract.repository.ts`
- Modify: `backend/application/repositories/extension/extension-in-memory.repository.ts`
- Modify: `backend/application/repositories/extension/extension-mongoose.repository.ts`
- Test: `backend/application/repositories/extension/extension-in-memory.repository.spec.ts` (novo)

Método que retorna todas as extensões PLUGIN ativas+disponíveis cujo `tableScope` cobre o `tableId` informado.

- [ ] **Step 1: Adicionar abstract method no contract**

Em `backend/application/repositories/extension/extension-contract.repository.ts`, adicionar dentro da `abstract class ExtensionContractRepository`:

```ts
  abstract findActiveForTable(tableId: string): Promise<IExtension[]>;
```

- [ ] **Step 2: Escrever teste do in-memory**

Criar `backend/application/repositories/extension/extension-in-memory.repository.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';

import { ExtensionInMemoryRepository } from './extension-in-memory.repository';
import { E_EXTENSION_TYPE } from '@application/core/entity.core';

describe('ExtensionInMemoryRepository.findActiveForTable', () => {
  let repo: ExtensionInMemoryRepository;

  beforeEach(() => {
    repo = new ExtensionInMemoryRepository();
  });

  it('retorna extensão PLUGIN enabled+available cuja tableScope inclui o tableId', async () => {
    await repo.upsert({
      pkg: 'core',
      type: E_EXTENSION_TYPE.PLUGIN,
      extensionId: 'visibility-by-role',
      name: 'X',
      description: null,
      version: '1.0.0',
      author: null,
      icon: null,
      image: null,
      slot: null,
      route: null,
      submenu: null,
      manifestSnapshot: {},
      requires: { lowcodejs: null, extensions: [] },
    });
    const all = await repo.findMany();
    const ext = all[0];
    await repo.toggleEnabled({ _id: ext._id, enabled: true });
    await repo.updateTableScope({
      _id: ext._id,
      tableScope: { mode: 'specific', tableIds: ['T1'] },
    });

    const result = await repo.findActiveForTable('T1');
    expect(result).toHaveLength(1);
    expect(result[0].extensionId).toBe('visibility-by-role');
  });

  it('retorna vazio quando disabled', async () => {
    // (similar mas sem toggleEnabled)
    await repo.upsert({
      pkg: 'core',
      type: E_EXTENSION_TYPE.PLUGIN,
      extensionId: 'visibility-by-role',
      name: 'X',
      description: null,
      version: '1.0.0',
      author: null,
      icon: null,
      image: null,
      slot: null,
      route: null,
      submenu: null,
      manifestSnapshot: {},
      requires: { lowcodejs: null, extensions: [] },
    });
    const all = await repo.findMany();
    await repo.updateTableScope({
      _id: all[0]._id,
      tableScope: { mode: 'specific', tableIds: ['T1'] },
    });
    const result = await repo.findActiveForTable('T1');
    expect(result).toHaveLength(0);
  });

  it('retorna vazio quando tableScope é "all" (modo não suportado por este plugin)', async () => {
    await repo.upsert({
      pkg: 'core',
      type: E_EXTENSION_TYPE.PLUGIN,
      extensionId: 'visibility-by-role',
      name: 'X',
      description: null,
      version: '1.0.0',
      author: null,
      icon: null,
      image: null,
      slot: null,
      route: null,
      submenu: null,
      manifestSnapshot: {},
      requires: { lowcodejs: null, extensions: [] },
    });
    const all = await repo.findMany();
    await repo.toggleEnabled({ _id: all[0]._id, enabled: true });
    // mode "all" deve incluir TODAS as tabelas — então T1 também.
    await repo.updateTableScope({
      _id: all[0]._id,
      tableScope: { mode: 'all', tableIds: [] },
    });
    const result = await repo.findActiveForTable('T1');
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Rodar — esperado falhar**

Run: `cd backend && npx vitest run application/repositories/extension/`
Expected: FAIL — `findActiveForTable is not a function`.

- [ ] **Step 4: Implementar no in-memory**

Em `extension-in-memory.repository.ts`, adicionar dentro da classe (após os outros métodos):

```ts
  async findActiveForTable(tableId: string): Promise<IExtension[]> {
    return this.items.filter((e) => {
      if (!e.enabled || !e.available) return false;
      if (e.type !== 'PLUGIN') return false;
      if (e.tableScope.mode === 'all') return true;
      return e.tableScope.tableIds.includes(tableId);
    });
  }
```

(Assumir que o array interno se chama `this.items` — verificar o nome real no arquivo e ajustar.)

- [ ] **Step 5: Implementar no mongoose**

Em `extension-mongoose.repository.ts`, adicionar:

```ts
  async findActiveForTable(tableId: string): Promise<IExtension[]> {
    const docs = await ExtensionModel.find({
      enabled: true,
      available: true,
      type: 'PLUGIN',
      $or: [
        { 'tableScope.mode': 'all' },
        { 'tableScope.mode': 'specific', 'tableScope.tableIds': tableId },
      ],
    }).lean();
    return docs.map(toIExtension); // helper já usado em findMany
  }
```

(O helper de mapeamento pode se chamar diferente — verificar `findMany` no mesmo arquivo e seguir o mesmo padrão.)

- [ ] **Step 6: Rodar testes**

Run: `cd backend && npx vitest run application/repositories/extension/`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/application/repositories/extension/
git commit -m "feat(extensions): repo.findActiveForTable(tableId)"
```

---

## Task 5: Criar `RowAccessGuardService` (skeleton, sem guards ainda)

**Files:**
- Create: `backend/application/core/extensions/row-access-guard.service.ts`
- Test: `backend/application/core/extensions/row-access-guard.service.spec.ts`
- Modify: `backend/application/core/di-registry.ts`

- [ ] **Step 1: Escrever teste**

Criar `backend/application/core/extensions/row-access-guard.service.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';

import { RowAccessGuardService } from './row-access-guard.service';
import { ExtensionInMemoryRepository } from '@application/repositories/extension/extension-in-memory.repository';

describe('RowAccessGuardService.getActiveGuardsFor', () => {
  let extensionRepo: ExtensionInMemoryRepository;
  let service: RowAccessGuardService;

  beforeEach(() => {
    extensionRepo = new ExtensionInMemoryRepository();
    service = new RowAccessGuardService(extensionRepo);
  });

  it('retorna lista vazia quando nao ha extensoes ativas para a tabela', async () => {
    const result = await service.getActiveGuardsFor('T_unknown');
    expect(result).toEqual([]);
  });

  it('ignora silenciosamente pluginKey nao mapeado', async () => {
    // popular extensão com pluginKey que não está no map
    await extensionRepo.upsert({
      pkg: 'core',
      type: 'PLUGIN' as any,
      extensionId: 'plugin-fantasma',
      name: 'X',
      description: null,
      version: '1.0.0',
      author: null,
      icon: null,
      image: null,
      slot: null,
      route: null,
      submenu: null,
      manifestSnapshot: {},
      requires: { lowcodejs: null, extensions: [] },
    });
    const [ext] = await extensionRepo.findMany();
    await extensionRepo.toggleEnabled({ _id: ext._id, enabled: true });
    await extensionRepo.updateTableScope({
      _id: ext._id,
      tableScope: { mode: 'specific', tableIds: ['T1'] },
    });

    const result = await service.getActiveGuardsFor('T1');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar — falha esperada**

Run: `cd backend && npx vitest run application/core/extensions/row-access-guard.service.spec.ts`
Expected: FAIL — "Cannot find module './row-access-guard.service'".

- [ ] **Step 3: Implementar o service skeleton**

Criar `backend/application/core/extensions/row-access-guard.service.ts`:

```ts
/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { RowAccessGuard } from './row-access-guard.contract';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';

const GUARDS: Record<string, RowAccessGuard> = {};

@Service()
export class RowAccessGuardService {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
  ) {}

  static register(key: string, guard: RowAccessGuard): void {
    GUARDS[key] = guard;
  }

  static getRegistered(): Record<string, RowAccessGuard> {
    return GUARDS;
  }

  async getActiveGuardsFor(tableId: string): Promise<RowAccessGuard[]> {
    const extensions = await this.extensionRepository.findActiveForTable(
      tableId,
    );
    return extensions
      .map((e) => GUARDS[`${e.pkg}:${e.extensionId}`])
      .filter((g): g is RowAccessGuard => Boolean(g));
  }
}
```

- [ ] **Step 4: Rodar — esperado passar**

Run: `cd backend && npx vitest run application/core/extensions/row-access-guard.service.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Registrar no DI**

Em `backend/application/core/di-registry.ts`, adicionar import e registro:

```ts
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';

// (perto dos outros injectablesHolder.injectService)
injectablesHolder.injectService(RowAccessGuardService, RowAccessGuardService);
```

- [ ] **Step 6: Commit**

```bash
git add backend/application/core/extensions/row-access-guard.service.ts backend/application/core/extensions/row-access-guard.service.spec.ts backend/application/core/di-registry.ts
git commit -m "feat(extensions): RowAccessGuardService com map estático de guards"
```

---

## Task 6: Implementar `VisibilityByRoleGuard`

**Files:**
- Create: `backend/extensions/core/plugins/visibility-by-role/manifest.json`
- Create: `backend/extensions/core/plugins/visibility-by-role/guard.ts`
- Test: `backend/extensions/core/plugins/visibility-by-role/guard.spec.ts`

- [ ] **Step 1: Criar manifest.json**

Criar `backend/extensions/core/plugins/visibility-by-role/manifest.json`:

```json
{
  "id": "visibility-by-role",
  "type": "PLUGIN",
  "name": "Visibilidade por Papel",
  "description": "Oculta registros marcados como Sigiloso para usuários MANAGER e REGISTERED. Apenas MASTER e ADMINISTRATOR veem registros Sigilosos.",
  "version": "1.0.0",
  "author": "Time Core",
  "icon": "EyeOff",
  "placement": {
    "kind": "row-access-guard"
  },
  "requires": {
    "lowcodejs": ">=1.0.0"
  }
}
```

- [ ] **Step 2: Escrever testes do guard (matriz canRead)**

Criar `backend/extensions/core/plugins/visibility-by-role/guard.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';

import { VisibilityByRoleGuard } from './guard';

const ROLES = ['MASTER', 'ADMINISTRATOR', 'MANAGER', 'REGISTERED'] as const;
const VISIBILITIES = ['PUBLIC', 'SIGILOSO', undefined] as const;

function makeUser(role: string) {
  return { _id: 'u1', email: 'u@x', role } as any;
}

function makeRow(visibility: string | undefined) {
  return { _id: 'r1', data: { visibility } } as any;
}

const TABLE = { _id: 'T1', fields: [] } as any;

describe('VisibilityByRoleGuard.canRead', () => {
  it.each(ROLES.flatMap((role) =>
    VISIBILITIES.map((vis) => ({ role, vis })),
  ))('role=$role visibility=$vis', ({ role, vis }) => {
    const result = VisibilityByRoleGuard.canRead(
      makeRow(vis),
      makeUser(role),
      TABLE,
    );
    const isAdmin = role === 'MASTER' || role === 'ADMINISTRATOR';
    const isPublic = vis === 'PUBLIC';
    expect(result).toBe(isAdmin || isPublic);
  });
});

describe('VisibilityByRoleGuard.adjustListQuery', () => {
  it('MASTER/ADMIN: query inalterada', () => {
    const q = { foo: 1 };
    expect(VisibilityByRoleGuard.adjustListQuery(q, makeUser('MASTER'), TABLE)).toEqual(q);
    expect(VisibilityByRoleGuard.adjustListQuery(q, makeUser('ADMINISTRATOR'), TABLE)).toEqual(q);
  });

  it('MANAGER/REGISTERED: filtra por data.visibility=PUBLIC', () => {
    const q = { foo: 1 };
    expect(VisibilityByRoleGuard.adjustListQuery(q, makeUser('MANAGER'), TABLE))
      .toEqual({ foo: 1, 'data.visibility': 'PUBLIC' });
  });

  it('user undefined (visitante): filtra como nao-admin', () => {
    const q = {};
    expect(VisibilityByRoleGuard.adjustListQuery(q, undefined, TABLE))
      .toEqual({ 'data.visibility': 'PUBLIC' });
  });
});

describe('VisibilityByRoleGuard.canWrite', () => {
  it('MASTER: allowed em qualquer caso', () => {
    expect(VisibilityByRoleGuard.canWrite(null, makeUser('MASTER'), TABLE, { visibility: 'SIGILOSO' }, 'create'))
      .toEqual({ allowed: true });
  });

  it('MANAGER tentando criar SIGILOSO: bloqueado', () => {
    const r = VisibilityByRoleGuard.canWrite(null, makeUser('MANAGER'), TABLE, { visibility: 'SIGILOSO' }, 'create');
    expect(r.allowed).toBe(false);
  });

  it('MANAGER tentando criar PUBLIC: allowed', () => {
    expect(VisibilityByRoleGuard.canWrite(null, makeUser('MANAGER'), TABLE, { visibility: 'PUBLIC' }, 'create'))
      .toEqual({ allowed: true });
  });
});

describe('VisibilityByRoleGuard.sanitizeWritePayload', () => {
  it('non-admin create: forca PUBLIC', () => {
    const r = VisibilityByRoleGuard.sanitizeWritePayload(
      { nome: 'x', visibility: 'SIGILOSO' },
      makeUser('MANAGER'),
      TABLE,
      'create',
      null,
    );
    expect(r.visibility).toBe('PUBLIC');
  });

  it('non-admin update: preserva o valor da row', () => {
    const r = VisibilityByRoleGuard.sanitizeWritePayload(
      { nome: 'x', visibility: 'SIGILOSO' },
      makeUser('MANAGER'),
      TABLE,
      'update',
      makeRow('PUBLIC'),
    );
    expect(r.visibility).toBe('PUBLIC');
  });

  it('admin update: payload preservado', () => {
    const r = VisibilityByRoleGuard.sanitizeWritePayload(
      { visibility: 'SIGILOSO' },
      makeUser('ADMINISTRATOR'),
      TABLE,
      'update',
      makeRow('PUBLIC'),
    );
    expect(r.visibility).toBe('SIGILOSO');
  });
});
```

- [ ] **Step 3: Rodar — falha esperada**

Run: `cd backend && npx vitest run extensions/core/plugins/visibility-by-role/guard.spec.ts`
Expected: FAIL — "Cannot find module './guard'".

- [ ] **Step 4: Implementar o guard (parte 1 — métodos puros, sem onTableBound)**

Criar `backend/extensions/core/plugins/visibility-by-role/guard.ts`:

```ts
/* eslint-disable no-unused-vars */
import { left, right } from '@application/core/either.core';
import type {
  IRow,
  ITable,
  IUser,
} from '@application/core/entity.core';
import { E_ROLE, E_VISIBILITY } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import type {
  GuardOperation,
  GuardWriteCheck,
  GuardBindResult,
  RowAccessGuard,
} from '@application/core/extensions/row-access-guard.contract';
import type { Either } from '@application/core/either.core';

const ADMIN_ROLES: string[] = [E_ROLE.MASTER, E_ROLE.ADMINISTRATOR];
const FIELD_SLUG = 'visibility';

function isAdmin(user: IUser | undefined): boolean {
  return Boolean(user && ADMIN_ROLES.includes(user.role));
}

export const VisibilityByRoleGuard: RowAccessGuard = {
  pluginKey: 'core:visibility-by-role',
  supportsScopeAll: false,

  async onTableBound(table: ITable): Promise<Either<HTTPException, GuardBindResult>> {
    // implementado na Task 7
    return right({ wasCreated: false });
  },

  adjustListQuery(query, user, _table) {
    if (isAdmin(user)) return query;
    return { ...query, [`data.${FIELD_SLUG}`]: E_VISIBILITY.PUBLIC };
  },

  canRead(row, user, _table) {
    if (isAdmin(user)) return true;
    return row.data?.[FIELD_SLUG] === E_VISIBILITY.PUBLIC;
  },

  canWrite(_row, user, _table, payload, _operation): GuardWriteCheck {
    if (isAdmin(user)) return { allowed: true };
    if (payload?.[FIELD_SLUG] === E_VISIBILITY.SIGILOSO) {
      return { allowed: false, reason: 'Sem permissão para marcar Sigiloso' };
    }
    return { allowed: true };
  },

  sanitizeWritePayload(payload, user, _table, operation, currentRow) {
    if (isAdmin(user)) return payload;
    if (operation === 'create') {
      return { ...payload, [FIELD_SLUG]: E_VISIBILITY.PUBLIC };
    }
    return { ...payload, [FIELD_SLUG]: currentRow?.data?.[FIELD_SLUG] ?? E_VISIBILITY.PUBLIC };
  },
};
```

- [ ] **Step 5: Rodar — esperado passar (exceto onTableBound)**

Run: `cd backend && npx vitest run extensions/core/plugins/visibility-by-role/guard.spec.ts`
Expected: PASS (matriz canRead 12 casos, adjustListQuery 3, canWrite 3, sanitizeWritePayload 3).

- [ ] **Step 6: Registrar guard no service**

Em `backend/application/core/extensions/row-access-guard.service.ts`, importar e registrar:

```ts
import { VisibilityByRoleGuard } from '@/extensions/core/plugins/visibility-by-role/guard';
```

(Caminho exato pode requerer ajuste do tsconfig — se o alias não existir, usar caminho relativo `../../../extensions/core/plugins/visibility-by-role/guard`.)

E no final do arquivo (após a definição da classe):

```ts
RowAccessGuardService.register(VisibilityByRoleGuard.pluginKey, VisibilityByRoleGuard);
```

- [ ] **Step 7: Commit**

```bash
git add backend/extensions/core/plugins/visibility-by-role/ backend/application/core/extensions/row-access-guard.service.ts
git commit -m "feat(extensions): VisibilityByRoleGuard (canRead/canWrite/sanitize/adjustListQuery)"
```

---

## Task 7: Implementar `onTableBound` do guard

**Files:**
- Modify: `backend/extensions/core/plugins/visibility-by-role/guard.ts`
- Test: `backend/extensions/core/plugins/visibility-by-role/guard-on-bound.spec.ts` (novo)

`onTableBound` cria o Field `Visibilidade` (DROPDOWN) e faz backfill (todas as rows existentes recebem `visibility=PUBLIC`). Falha com 409 se já existir um field `visibility` incompatível.

**Importante:** o guard precisa acessar `FieldContractRepository` e a coleção dinâmica de rows. Como o guard é um objeto exportado (não classe DI), precisamos injetar as dependências de forma estática. Padrão: o service injeta no boot.

- [ ] **Step 1: Adicionar setter de deps no guard**

Modificar `guard.ts` — adicionar acima do `export const VisibilityByRoleGuard`:

```ts
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import type { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { E_FIELD_TYPE } from '@application/core/entity.core';

type Deps = {
  fieldRepo: FieldContractRepository;
  tableRepo: TableContractRepository;
};

let deps: Deps | null = null;

export function injectVisibilityByRoleGuardDeps(d: Deps): void {
  deps = d;
}
```

- [ ] **Step 2: Implementar onTableBound usando `deps`**

Substituir o método `onTableBound` placeholder por:

```ts
  async onTableBound(table: ITable): Promise<Either<HTTPException, GuardBindResult>> {
    if (!deps) {
      return left(
        HTTPException.InternalServerError(
          'VisibilityByRoleGuard sem dependências injetadas',
          'GUARD_DEPS_MISSING',
        ),
      );
    }

    const existing = table.fields.find((f) => f.slug === FIELD_SLUG);

    let wasCreated = false;
    if (existing) {
      const optionsOk = existing.type === E_FIELD_TYPE.DROPDOWN
        && Array.isArray(existing.options)
        && existing.options.length === 2
        && existing.options.some((o: { value: string }) => o.value === E_VISIBILITY.PUBLIC)
        && existing.options.some((o: { value: string }) => o.value === E_VISIBILITY.SIGILOSO);
      if (!optionsOk) {
        return left(
          HTTPException.Conflict(
            `Tabela já possui campo "${FIELD_SLUG}" incompatível com o plugin`,
            'PLUGIN_BIND_CONFLICT',
          ),
        );
      }
    } else {
      await deps.fieldRepo.create({
        tableId: table._id,
        slug: FIELD_SLUG,
        label: 'Visibilidade',
        type: E_FIELD_TYPE.DROPDOWN,
        options: [
          { value: E_VISIBILITY.PUBLIC, label: 'Público' },
          { value: E_VISIBILITY.SIGILOSO, label: 'Sigiloso' },
        ],
        required: false,
      } as any);
      wasCreated = true;
    }

    // backfill idempotente
    await deps.tableRepo.updateManyRowsMissingField(table, FIELD_SLUG, E_VISIBILITY.PUBLIC);

    return right({ wasCreated });
  },
```

**Nota:** `FieldContractRepository.create` pode ter outra assinatura — checar `backend/application/repositories/field/field-contract.repository.ts` e ajustar. O método `updateManyRowsMissingField` em `TableContractRepository` pode não existir ainda — se não existir, ver Task 7.5 abaixo.

- [ ] **Step 3: Inspecionar TableContractRepository**

Run: `grep -n "updateMany\|insertMany" backend/application/repositories/table/table-contract.repository.ts`
Expected: se já existe `updateManyRows` ou similar, usar. Se não, prosseguir pra Task 7.5.

- [ ] **Step 4: Escrever teste do onTableBound**

Criar `backend/extensions/core/plugins/visibility-by-role/guard-on-bound.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';

import { VisibilityByRoleGuard, injectVisibilityByRoleGuardDeps } from './guard';
import { FieldInMemoryRepository } from '@application/repositories/field/field-in-memory.repository';
import { TableInMemoryRepository } from '@application/repositories/table/table-in-memory.repository';

describe('VisibilityByRoleGuard.onTableBound', () => {
  let fieldRepo: FieldInMemoryRepository;
  let tableRepo: TableInMemoryRepository;

  beforeEach(() => {
    fieldRepo = new FieldInMemoryRepository();
    tableRepo = new TableInMemoryRepository();
    injectVisibilityByRoleGuardDeps({ fieldRepo, tableRepo });
  });

  it('cria field Visibilidade quando ausente, marca wasCreated=true', async () => {
    const table = { _id: 'T1', fields: [], slug: 't1' } as any;
    const result = await VisibilityByRoleGuard.onTableBound(table);
    expect(result.isRight()).toBe(true);
    expect((result.value as any).wasCreated).toBe(true);
    const fields = await fieldRepo.findByTable('T1');
    expect(fields.find((f) => f.slug === 'visibility')).toBeDefined();
  });

  it('faz skip create quando field ja existe compativel; wasCreated=false', async () => {
    const table = {
      _id: 'T2',
      slug: 't2',
      fields: [{
        slug: 'visibility',
        type: 'DROPDOWN',
        options: [
          { value: 'PUBLIC', label: 'Público' },
          { value: 'SIGILOSO', label: 'Sigiloso' },
        ],
      }],
    } as any;
    const result = await VisibilityByRoleGuard.onTableBound(table);
    expect(result.isRight()).toBe(true);
    expect((result.value as any).wasCreated).toBe(false);
  });

  it('retorna Conflict quando field visibility ja existe mas incompativel', async () => {
    const table = {
      _id: 'T3',
      slug: 't3',
      fields: [{ slug: 'visibility', type: 'TEXT_SHORT', options: [] }],
    } as any;
    const result = await VisibilityByRoleGuard.onTableBound(table);
    expect(result.isLeft()).toBe(true);
    expect((result.value as any).code).toBe(409);
  });
});
```

- [ ] **Step 5: Rodar — esperado falhar se métodos ainda não existem nos repos in-memory**

Run: `cd backend && npx vitest run extensions/core/plugins/visibility-by-role/guard-on-bound.spec.ts`
Expected: FAIL — `findByTable` / `updateManyRowsMissingField` ainda não existem.

- [ ] **Step 6: Implementar `findByTable` em FieldInMemory (se faltar)**

Verificar `backend/application/repositories/field/field-in-memory.repository.ts`. Se `findByTable(tableId)` não existir, adicionar (mesma assinatura no contract).

- [ ] **Step 7: Implementar `updateManyRowsMissingField` em TableContract + impls**

**Contract** (`backend/application/repositories/table/table-contract.repository.ts`):

```ts
  abstract updateManyRowsMissingField(
    table: ITable,
    fieldSlug: string,
    defaultValue: unknown,
  ): Promise<{ matched: number; modified: number }>;
```

**InMemory** (`table-in-memory.repository.ts`):

```ts
  async updateManyRowsMissingField(table, fieldSlug, defaultValue) {
    // Implementação in-memory: itera rows armazenadas localmente
    const rows = this.rowsByTable.get(table._id) ?? [];
    let modified = 0;
    rows.forEach((r) => {
      if (r.data?.[fieldSlug] === undefined) {
        r.data = { ...r.data, [fieldSlug]: defaultValue };
        modified++;
      }
    });
    return { matched: rows.length, modified };
  }
```

(Estrutura interna `rowsByTable` pode não existir ainda — adaptar ao padrão atual.)

**Mongoose** (`table-mongoose.repository.ts`):

```ts
  async updateManyRowsMissingField(table, fieldSlug, defaultValue) {
    const Model = buildTable(table);
    const filter = { [`data.${fieldSlug}`]: { $exists: false } };
    const update = { $set: { [`data.${fieldSlug}`]: defaultValue } };
    const result = await Model.updateMany(filter, update);
    return { matched: result.matchedCount, modified: result.modifiedCount };
  }
```

- [ ] **Step 8: Rodar testes — esperado passar**

Run: `cd backend && npx vitest run extensions/core/plugins/visibility-by-role/guard-on-bound.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat(visibility-plugin): onTableBound cria field e backfilla PUBLIC"
```

---

## Task 8: Injetar deps do guard no boot

**Files:**
- Modify: `backend/bin/server.ts`

O guard precisa dos repos no boot. Como ele é objeto estático, injetar logo após o init do DI.

- [ ] **Step 1: Adicionar injeção no server.ts**

Em `backend/bin/server.ts`, após o ponto em que os repos já estão registrados via DI (procurar a chamada ao `loadExtensions` ou `kernel.ready()`), adicionar:

```ts
import { injectVisibilityByRoleGuardDeps } from '@/extensions/core/plugins/visibility-by-role/guard';
import { getInstanceByToken } from 'fastify-decorators';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import { FieldMongooseRepository } from '@application/repositories/field/field-mongoose.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { TableMongooseRepository } from '@application/repositories/table/table-mongoose.repository';

// (após o kernel estar pronto e DI carregado)
injectVisibilityByRoleGuardDeps({
  fieldRepo: getInstanceByToken<FieldContractRepository>(FieldMongooseRepository),
  tableRepo: getInstanceByToken<TableContractRepository>(TableMongooseRepository),
});
```

- [ ] **Step 2: Boot manual e verificar logs**

Run: `cd backend && npm run dev` (em background)
Aguardar logs de "Server running on..." (~5s).
Expected: nenhum erro de inicialização sobre dependências.
Kill: Ctrl+C / parar background process.

- [ ] **Step 3: Commit**

```bash
git add backend/bin/server.ts
git commit -m "feat(boot): injetar deps do VisibilityByRoleGuard"
```

---

## Task 9: Integrar `RowAccessGuardService` no `ConfigureTableScopeUseCase`

**Files:**
- Modify: `backend/application/resources/extensions/configure-table-scope/configure-table-scope.use-case.ts`
- Test: `backend/application/resources/extensions/configure-table-scope/configure-table-scope.use-case.spec.ts` (provavelmente já existe; adicionar casos)

Quando MASTER salva o scope, para cada `tableId` recém-adicionado, chamar `guard.onTableBound`. Se algum falhar, reverter (deletar fields recém-criados nos anteriores) e retornar erro.

- [ ] **Step 1: Adicionar casos de teste**

Em `configure-table-scope.use-case.spec.ts` (criar se não existir):

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import ExtensionConfigureTableScopeUseCase from './configure-table-scope.use-case';
import { ExtensionInMemoryRepository } from '@application/repositories/extension/extension-in-memory.repository';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import { VisibilityByRoleGuard, injectVisibilityByRoleGuardDeps } from '@/extensions/core/plugins/visibility-by-role/guard';
import { FieldInMemoryRepository } from '@application/repositories/field/field-in-memory.repository';
import { TableInMemoryRepository } from '@application/repositories/table/table-in-memory.repository';

describe('ExtensionConfigureTableScopeUseCase', () => {
  let extensionRepo: ExtensionInMemoryRepository;
  let fieldRepo: FieldInMemoryRepository;
  let tableRepo: TableInMemoryRepository;
  let guardService: RowAccessGuardService;
  let useCase: ExtensionConfigureTableScopeUseCase;
  let extensionId: string;

  beforeEach(async () => {
    extensionRepo = new ExtensionInMemoryRepository();
    fieldRepo = new FieldInMemoryRepository();
    tableRepo = new TableInMemoryRepository();
    injectVisibilityByRoleGuardDeps({ fieldRepo, tableRepo });
    RowAccessGuardService.register(VisibilityByRoleGuard.pluginKey, VisibilityByRoleGuard);
    guardService = new RowAccessGuardService(extensionRepo);
    useCase = new ExtensionConfigureTableScopeUseCase(extensionRepo, guardService);

    // popular extensão
    await extensionRepo.upsert({
      pkg: 'core',
      type: 'PLUGIN' as any,
      extensionId: 'visibility-by-role',
      name: 'Visibilidade por Papel',
      description: null,
      version: '1.0.0',
      author: null,
      icon: null,
      image: null,
      slot: null,
      route: null,
      submenu: null,
      manifestSnapshot: {},
      requires: { lowcodejs: null, extensions: [] },
    });
    const [ext] = await extensionRepo.findMany();
    extensionId = ext._id;
    await extensionRepo.toggleEnabled({ _id: extensionId, enabled: true });

    // popular tabelas
    await tableRepo.create({ _id: 'T1', slug: 't1', fields: [] } as any);
    await tableRepo.create({ _id: 'T2', slug: 't2', fields: [] } as any);
  });

  it('cria field Visibilidade em cada tabela do novo scope', async () => {
    const result = await useCase.execute({
      _id: extensionId,
      tableScope: { mode: 'specific', tableIds: ['T1', 'T2'] },
    });
    expect(result.isRight()).toBe(true);
    expect((await fieldRepo.findByTable('T1')).find((f) => f.slug === 'visibility')).toBeDefined();
    expect((await fieldRepo.findByTable('T2')).find((f) => f.slug === 'visibility')).toBeDefined();
  });

  it('rollback: se 2a tabela falha, field criado na 1a e revertido', async () => {
    // popular T2 com field visibility incompativel
    await tableRepo.update('T2', {
      fields: [{ slug: 'visibility', type: 'TEXT_SHORT', options: [] }],
    } as any);

    const result = await useCase.execute({
      _id: extensionId,
      tableScope: { mode: 'specific', tableIds: ['T1', 'T2'] },
    });
    expect(result.isLeft()).toBe(true);
    expect((result.value as any).cause).toBe('PLUGIN_BIND_CONFLICT');

    // T1 não deve ter o field (revertido)
    const t1Fields = await fieldRepo.findByTable('T1');
    expect(t1Fields.find((f) => f.slug === 'visibility')).toBeUndefined();

    // scope no extension não muda
    const stored = await extensionRepo.findById(extensionId);
    expect(stored?.tableScope.tableIds).not.toContain('T1');
  });

  it('rejeita mode="all" se plugin tem supportsScopeAll=false', async () => {
    const result = await useCase.execute({
      _id: extensionId,
      tableScope: { mode: 'all', tableIds: [] },
    });
    expect(result.isLeft()).toBe(true);
    expect((result.value as any).cause).toBe('SCOPE_ALL_NOT_SUPPORTED');
  });
});
```

- [ ] **Step 2: Rodar — falha esperada (use-case ainda não chama guards)**

Run: `cd backend && npx vitest run application/resources/extensions/configure-table-scope/`
Expected: FAIL.

- [ ] **Step 3: Atualizar use-case**

Substituir conteúdo de `configure-table-scope.use-case.ts`:

```ts
/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  E_EXTENSION_TYPE,
  type IExtension,
  type IExtensionTableScope,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';

type Input = { _id: string; tableScope: IExtensionTableScope };
type Response = Either<HTTPException, IExtension>;

@Service()
export default class ExtensionConfigureTableScopeUseCase {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
    private readonly guardService: RowAccessGuardService,
  ) {}

  async execute({ _id, tableScope }: Input): Promise<Response> {
    try {
      const existing = await this.extensionRepository.findById(_id);
      if (!existing) {
        return left(HTTPException.NotFound('Extensão não encontrada', 'EXTENSION_NOT_FOUND'));
      }
      if (existing.type !== E_EXTENSION_TYPE.PLUGIN) {
        return left(HTTPException.BadRequest('Escopo por tabela só se aplica a plugins', 'TABLE_SCOPE_NOT_APPLICABLE'));
      }

      const pluginKey = `${existing.pkg}:${existing.extensionId}`;
      const guards = RowAccessGuardService.getRegistered();
      const guard = guards[pluginKey];

      // Validar supportsScopeAll
      if (tableScope.mode === 'all' && guard && !guard.supportsScopeAll) {
        return left(HTTPException.BadRequest(
          'Este plugin não suporta o modo "Todas as tabelas"',
          'SCOPE_ALL_NOT_SUPPORTED',
        ));
      }

      // Diff: novas tabelas no scope
      const previousIds = new Set(existing.tableScope.tableIds);
      const newlyAdded = tableScope.mode === 'specific'
        ? tableScope.tableIds.filter((id) => !previousIds.has(id))
        : [];

      // Se há guard, rodar onTableBound em cada nova; compensar se algum falhar
      const compensations: Array<() => Promise<void>> = [];
      if (guard) {
        for (const tableId of newlyAdded) {
          // buscar tabela (via service de Table? — usar TableRepo)
          // NB: o use-case atualmente não tem TableRepo. Adicionar aqui:
          throw new Error('Esta versão ainda precisa de TableContractRepository — ver Step 4');
        }
      }

      const updated = await this.extensionRepository.updateTableScope({ _id, tableScope });
      return right(updated);
    } catch (error) {
      console.error('[extensions > configure-table-scope][error]:', error);
      return left(HTTPException.InternalServerError('Erro ao configurar escopo de tabelas', 'CONFIGURE_TABLE_SCOPE_ERROR'));
    }
  }
}
```

- [ ] **Step 4: Refinar — adicionar TableContractRepository ao use-case**

Substituir o bloco do `if (guard)` para resolver tabelas e processar onTableBound + compensação:

```ts
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';

// no constructor adicionar tableRepository e fieldRepository
constructor(
  private readonly extensionRepository: ExtensionContractRepository,
  private readonly guardService: RowAccessGuardService,
  private readonly tableRepository: TableContractRepository,
  private readonly fieldRepository: FieldContractRepository,
) {}

// (...)

if (guard) {
  const compensations: Array<() => Promise<void>> = [];
  for (const tableId of newlyAdded) {
    const table = await this.tableRepository.findById(tableId);
    if (!table) {
      // compensar tudo até aqui
      for (const undo of compensations.reverse()) await undo();
      return left(HTTPException.BadRequest(`Tabela ${tableId} não encontrada`, 'TABLE_NOT_FOUND'));
    }
    const bindResult = await guard.onTableBound(table);
    if (bindResult.isLeft()) {
      for (const undo of compensations.reverse()) await undo();
      return left(bindResult.value);
    }
    const { wasCreated } = bindResult.value;
    if (wasCreated) {
      compensations.push(async () => {
        const fields = await this.fieldRepository.findByTable(tableId);
        const created = fields.find((f) => f.slug === 'visibility');
        if (created) await this.fieldRepository.delete(created._id);
      });
    }
  }
}
```

- [ ] **Step 5: Rodar testes — esperado passar**

Run: `cd backend && npx vitest run application/resources/extensions/configure-table-scope/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/application/resources/extensions/configure-table-scope/
git commit -m "feat(extensions): configure-table-scope dispara onTableBound com rollback"
```

---

## Task 10: Integrar guards no `paginated` (listagem)

**Files:**
- Modify: `backend/application/resources/table-rows/paginated/paginated.use-case.ts`
- Test: `backend/application/resources/table-rows/paginated/paginated.use-case.spec.ts` (já existe — adicionar casos)

- [ ] **Step 1: Inspecionar use-case atual**

Run: `cat backend/application/resources/table-rows/paginated/paginated.use-case.ts`
Identificar onde a query mongo é montada (provavelmente via `buildQuery`).

- [ ] **Step 2: Adicionar caso de teste**

No spec do paginated:

```ts
it('MANAGER + plugin ativo na tabela: filtra SIGILOSO da listagem', async () => {
  // arrange: criar tabela, plugin ativado, scope em T1, 2 rows (1 PUBLIC, 1 SIGILOSO)
  // act: paginated com user MANAGER
  // assert: meta.total === 1; data não inclui SIGILOSO
});
```

- [ ] **Step 3: Implementar — injetar guards**

Adicionar `RowAccessGuardService` ao constructor do use-case e, antes de executar a query:

```ts
const guards = await this.guardService.getActiveGuardsFor(table._id);
let mongoQuery = baseQuery; // o existente
for (const g of guards) {
  mongoQuery = g.adjustListQuery(mongoQuery, payload.user, table);
}
```

(O `payload.user` provavelmente é só o `_id`. Pra `user.role` precisamos resolver o user via `UserContractRepository`. Verificar como `show.use-case.ts` faz e seguir o padrão.)

- [ ] **Step 4: Rodar testes**

Run: `cd backend && npx vitest run application/resources/table-rows/paginated/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/application/resources/table-rows/paginated/
git commit -m "feat(table-rows): paginated aplica RowAccessGuard.adjustListQuery"
```

---

## Task 11: Integrar guards no `show`

**Files:**
- Modify: `backend/application/resources/table-rows/show/show.use-case.ts`
- Modify: `backend/application/resources/table-rows/show/show.use-case.spec.ts`

- [ ] **Step 1: Adicionar caso de teste**

```ts
it('MANAGER + plugin ativo: GET de row SIGILOSA retorna 403 ROW_ACCESS_DENIED', async () => {
  // arrange: similar ao paginated, row SIGILOSA
  // act: useCase.execute({ slug, _id: rowId, user: managerId })
  // assert: result.isLeft(); result.value.code === 403; result.value.cause === 'ROW_ACCESS_DENIED'
});
```

- [ ] **Step 2: Modificar use-case**

Após `const row = await this.rowRepository.findOne(...)` e o null-check:

```ts
const guards = await this.guardService.getActiveGuardsFor(table._id);
const user = payload.user ? await this.userRepository.findById(payload.user) : undefined;
for (const g of guards) {
  if (!g.canRead(row, user ?? undefined, table)) {
    return left(HTTPException.Forbidden('Sem permissão para acessar este registro', 'ROW_ACCESS_DENIED'));
  }
}
```

Adicionar `RowAccessGuardService` e `UserContractRepository` ao constructor.

- [ ] **Step 3: Rodar testes**

Run: `cd backend && npx vitest run application/resources/table-rows/show/`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/application/resources/table-rows/show/
git commit -m "feat(table-rows): show aplica RowAccessGuard.canRead"
```

---

## Task 12: Integrar guards no `update`

**Files:**
- Modify: `backend/application/resources/table-rows/update/update.use-case.ts`
- Modify: spec correspondente

- [ ] **Step 1: Adicionar casos de teste**

```ts
it('MANAGER tentando setar visibility=SIGILOSO em row PUBLIC: 403 ROW_WRITE_RESTRICTED', async () => { ... });
it('MANAGER editando row PUBLIC sem mexer em visibility: sucesso, visibility=PUBLIC preservado', async () => { ... });
it('MANAGER editando row SIGILOSA: 403 ROW_ACCESS_DENIED (canRead falha)', async () => { ... });
```

- [ ] **Step 2: Modificar use-case**

Pseudo-código (adaptar à estrutura real):

```ts
const guards = await this.guardService.getActiveGuardsFor(table._id);
const user = payload.user ? await this.userRepository.findById(payload.user) : undefined;

for (const g of guards) {
  if (!g.canRead(row, user ?? undefined, table)) {
    return left(HTTPException.Forbidden('Sem permissão para acessar este registro', 'ROW_ACCESS_DENIED'));
  }
  const check = g.canWrite(row, user ?? undefined, table, payload.data, 'update');
  if (!check.allowed) {
    return left(HTTPException.Forbidden(check.reason, 'ROW_WRITE_RESTRICTED'));
  }
}

let data = payload.data;
for (const g of guards) {
  data = g.sanitizeWritePayload(data, user ?? undefined, table, 'update', row) as typeof data;
}

// prosseguir com data sanitized
```

- [ ] **Step 3: Rodar testes**

Run: `cd backend && npx vitest run application/resources/table-rows/update/`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/application/resources/table-rows/update/
git commit -m "feat(table-rows): update aplica guard.canRead + canWrite + sanitize"
```

---

## Task 13: Integrar guards no `delete`

**Files:**
- Modify: `backend/application/resources/table-rows/delete/delete.use-case.ts`
- Modify: spec correspondente

- [ ] **Step 1: Adicionar casos de teste**

```ts
it('MANAGER tentando DELETE row SIGILOSA: 403 ROW_ACCESS_DENIED', async () => { ... });
it('MASTER deletando row SIGILOSA: sucesso', async () => { ... });
```

- [ ] **Step 2: Modificar use-case**

```ts
const guards = await this.guardService.getActiveGuardsFor(table._id);
const user = payload.user ? await this.userRepository.findById(payload.user) : undefined;
for (const g of guards) {
  if (!g.canRead(row, user ?? undefined, table)) {
    return left(HTTPException.Forbidden('Sem permissão para acessar este registro', 'ROW_ACCESS_DENIED'));
  }
  const check = g.canWrite(row, user ?? undefined, table, null, 'delete');
  if (!check.allowed) {
    return left(HTTPException.Forbidden(check.reason, 'ROW_WRITE_RESTRICTED'));
  }
}
```

- [ ] **Step 3: Rodar testes**

Run: `cd backend && npx vitest run application/resources/table-rows/delete/`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/application/resources/table-rows/delete/
git commit -m "feat(table-rows): delete aplica guard.canRead + canWrite"
```

---

## Task 14: Integrar guards no `create`

**Files:**
- Modify: `backend/application/resources/table-rows/create/create.use-case.ts`
- Modify: spec correspondente

- [ ] **Step 1: Adicionar casos de teste**

```ts
it('MANAGER criando row com visibility=SIGILOSO: payload forcado pra PUBLIC', async () => { ... });
it('MASTER criando row com visibility=SIGILOSO: payload preservado', async () => { ... });
it('MANAGER criando row sem visibility no payload: forcado pra PUBLIC', async () => { ... });
```

- [ ] **Step 2: Modificar use-case**

```ts
const guards = await this.guardService.getActiveGuardsFor(table._id);
const user = payload.user ? await this.userRepository.findById(payload.user) : undefined;

// canWrite (não há row ainda; passa null)
for (const g of guards) {
  const check = g.canWrite(null, user ?? undefined, table, payload.data, 'create');
  if (!check.allowed) {
    return left(HTTPException.Forbidden(check.reason, 'ROW_WRITE_RESTRICTED'));
  }
}

let data = payload.data;
for (const g of guards) {
  data = g.sanitizeWritePayload(data, user ?? undefined, table, 'create', null) as typeof data;
}
```

- [ ] **Step 3: Rodar testes**

Run: `cd backend && npx vitest run application/resources/table-rows/create/`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/application/resources/table-rows/create/
git commit -m "feat(table-rows): create aplica guard.canWrite + sanitize"
```

---

## Task 15: Migration — index `(tableId, data.visibility)`

**Files:**
- Create: `backend/database/migrations/migrate-add-visibility-index.ts`

**Importante:** rows estão em coleções dinâmicas (uma por tabela.slug). O index precisa ser criado em todas as coleções que tenham campo `visibility`. Estratégia: criar quando a tabela passa a ter o field. Mais simples: criar lazy na primeira chamada `onTableBound`. Mas migration centralizada é boa pra ambientes que já têm o plugin ativo.

Versão MVP: migration que itera por todas as tabelas com plugin ativo no scope e cria o index na coleção dinâmica.

- [ ] **Step 1: Criar a migration**

```ts
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

import { MongooseConnect } from '@/config/database.config';
import { buildTable } from '@application/core/util.core';
import { ExtensionMongooseRepository } from '@application/repositories/extension/extension-mongoose.repository';
import { TableMongooseRepository } from '@application/repositories/table/table-mongoose.repository';

config({ path: resolve('.env') });

const MARKER = 'MIGRATION_VISIBILITY_INDEX_AT';

async function run(): Promise<void> {
  await MongooseConnect();

  const extensions = new ExtensionMongooseRepository();
  const tables = new TableMongooseRepository();

  const plugin = await extensions.findByKey('core', 'PLUGIN' as any, 'visibility-by-role');
  if (!plugin || !plugin.enabled) {
    console.log('[migrate-add-visibility-index] plugin inativo, nada a fazer');
    await mongoose.disconnect();
    return;
  }

  const tableIds = plugin.tableScope.mode === 'specific'
    ? plugin.tableScope.tableIds
    : [];

  for (const tableId of tableIds) {
    const table = await tables.findById(tableId);
    if (!table) continue;
    const Model = buildTable(table);
    await Model.collection.createIndex({ tableId: 1, 'data.visibility': 1 });
    console.log(`[migrate-add-visibility-index] index criado em ${table.slug}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[migrate-add-visibility-index] erro:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Adicionar script no package.json do backend**

Em `backend/package.json`, na seção `scripts`:

```json
"migrate:visibility-index": "node --loader @swc-node/register/esm-register database/migrations/migrate-add-visibility-index.ts"
```

- [ ] **Step 3: Adicionar ao docker-entrypoint.sh**

Em `backend/docker-entrypoint.sh`, depois da migration `dual-connection`:

```sh
npm run migrate:visibility-index
```

- [ ] **Step 4: Smoke run local (opcional)**

Run: `cd backend && npm run migrate:visibility-index`
Expected: log "plugin inativo, nada a fazer" (plugin ainda não foi ativado).

- [ ] **Step 5: Commit**

```bash
git add backend/database/migrations/migrate-add-visibility-index.ts backend/package.json backend/docker-entrypoint.sh
git commit -m "feat(migrations): index (tableId, data.visibility) em tabelas com plugin ativo"
```

---

## Task 16: Hook `useExtensionsBoundToTable`

**Files:**
- Create: `frontend/src/hooks/tanstack-query/use-extensions-bound-to-table.tsx`
- Modify: `frontend/src/hooks/tanstack-query/_query-keys.ts`

- [ ] **Step 1: Adicionar query key**

Em `_query-keys.ts`, na fábrica `extensions`:

```ts
boundTo: (tableId: string) => [...queryKeys.extensions.all, 'bound-to', tableId] as const,
```

- [ ] **Step 2: Criar o hook**

```tsx
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IExtension } from '@/lib/interfaces';

export function useExtensionsBoundToTable(
  tableId: string,
  options?: Omit<UseQueryOptions<IExtension[], AxiosError | Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: queryKeys.extensions.boundTo(tableId),
    queryFn: async () => {
      // Filtra client-side via lista existente
      const all = await API.get<IExtension[]>('/extensions').then((r) => r.data);
      return all.filter((e) =>
        e.enabled
        && e.available
        && e.type === 'PLUGIN'
        && (e.tableScope.mode === 'all' || e.tableScope.tableIds.includes(tableId)),
      );
    },
    staleTime: 60_000,
    ...options,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/tanstack-query/
git commit -m "feat(extensions/ui): hook useExtensionsBoundToTable"
```

---

## Task 17: Adicionar `E_VISIBILITY` no constant.ts (frontend)

**Files:**
- Modify: `frontend/src/lib/constant.ts`

- [ ] **Step 1: Adicionar enum**

```ts
export const E_VISIBILITY = {
  PUBLIC: 'PUBLIC',
  SIGILOSO: 'SIGILOSO',
} as const;
export type E_VISIBILITY = (typeof E_VISIBILITY)[keyof typeof E_VISIBILITY];
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/constant.ts
git commit -m "feat(constants): E_VISIBILITY no frontend"
```

---

## Task 18: Desabilitar campo Visibilidade no -create-row-form.tsx (não-admin)

**Files:**
- Modify: `frontend/src/routes/_private/tables/$slug/row/create/-create-row-form.tsx`

- [ ] **Step 1: Encontrar a renderização do field**

Run: `grep -n 'fields.map\|field.slug' frontend/src/routes/_private/tables/$slug/row/create/-create-row-form.tsx | head -10`
Identificar onde os fields são renderizados.

- [ ] **Step 2: Adicionar lógica condicional**

No topo do componente, importar:

```tsx
import { useExtensionsBoundToTable } from '@/hooks/tanstack-query/use-extensions-bound-to-table';
import { useAuthStore } from '@/stores/authentication';
import { E_ROLE } from '@/lib/constant';
```

E dentro do componente, antes do render dos fields:

```tsx
const user = useAuthStore((s) => s.user);
const { data: boundPlugins = [] } = useExtensionsBoundToTable(table._id);
const isVisibilityPluginActive = boundPlugins.some(
  (e) => `${e.pkg}:${e.extensionId}` === 'core:visibility-by-role',
);
const canEditVisibility = user
  && [E_ROLE.MASTER, E_ROLE.ADMINISTRATOR].includes(user.role as any);
```

Na renderização do field, passar `disabled` condicionalmente:

```tsx
const disabled = field.slug === 'visibility' && isVisibilityPluginActive && !canEditVisibility;
// passar `disabled` para o componente do field
```

- [ ] **Step 3: Smoke manual**

Run: `cd frontend && npm run dev` (background)
Abrir browser, logar como MANAGER, criar row em tabela bound → field Visibilidade deve estar desabilitado.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/_private/tables/$slug/row/create/-create-row-form.tsx
git commit -m "feat(table-row form): desabilita Visibilidade para nao-admin"
```

---

## Task 19: Desabilitar campo Visibilidade no -update-row-form.tsx (não-admin)

**Files:**
- Modify: `frontend/src/routes/_private/tables/$slug/row/$rowId/-update-row-form.tsx`

Mesmo padrão da Task 18 — duplicar o trecho de lógica e aplicar.

- [ ] **Step 1: Aplicar mesma mudança**

Importar `useExtensionsBoundToTable`, `useAuthStore`, `E_ROLE`. Computar `disabled` e passar.

- [ ] **Step 2: Smoke manual**

Logar como MANAGER, editar row PUBLIC em tabela bound → campo desabilitado.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/_private/tables/$slug/row/$rowId/-update-row-form.tsx
git commit -m "feat(table-row form): desabilita Visibilidade no update tambem"
```

---

## Task 20: Desabilitar radio "Todas as tabelas" em extensions/index.lazy.tsx

**Files:**
- Modify: `frontend/src/routes/_private/extensions/index.lazy.tsx`

Quando o plugin selecionado tem `supportsScopeAll: false` (info **não vem do manifest** — precisa expor no `IExtension` ou hardcode no frontend mirror).

Decisão MVP: hardcode no frontend — map `pluginKey → supportsScopeAll`. Quando aparecer um segundo plugin, virar config.

- [ ] **Step 1: Adicionar constante**

No topo de `index.lazy.tsx`:

```tsx
const SCOPE_ALL_BLOCKLIST: ReadonlySet<string> = new Set([
  'core:visibility-by-role',
]);
```

- [ ] **Step 2: Aplicar no radio**

Onde o radio "all" é renderizado (na sheet de configure), passar `disabled` quando o plugin atual estiver no blocklist:

```tsx
const pluginKey = `${extension.pkg}:${extension.extensionId}`;
const disableScopeAll = SCOPE_ALL_BLOCKLIST.has(pluginKey);
// <RadioGroupItem value="all" disabled={disableScopeAll} />
```

Adicionar tooltip explicando: "Este plugin requer seleção explícita de tabelas".

- [ ] **Step 3: Smoke manual**

Workshop /extensions → Configurar plugin Visibilidade por Papel → radio "Todas" desabilitado.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/_private/extensions/index.lazy.tsx
git commit -m "feat(extensions/ui): bloqueia mode=all para plugins do blocklist"
```

---

## Task 21: Atualizar CLAUDE.mds e criar README do plugin

**Files:**
- Modify: `backend/extensions/CLAUDE.md`
- Create: `backend/extensions/core/plugins/visibility-by-role/README.md`

- [ ] **Step 1: README do plugin**

Conteúdo do `README.md`:

```md
# Plugin: Visibilidade por Papel

Filtra registros de tabelas vinculadas conforme o role do usuário:
- **MASTER, ADMINISTRATOR**: veem todos os registros (Público e Sigiloso)
- **MANAGER, REGISTERED**: só veem `Público`

## Ativação

1. MASTER acessa `/extensions`
2. Liga o toggle "Visibilidade por Papel"
3. Clica "Configurar" e seleciona as tabelas alvo
4. O plugin cria automaticamente o field `Visibilidade` (DROPDOWN) e marca todas as rows existentes como `Público`

## Restrições

- Apenas ADMIN+MASTER podem marcar registros como `Sigiloso`
- Acesso direto a registros `Sigilosos` por não-admin retorna 403
- Modo "Todas as tabelas" não é suportado (apenas seleção explícita)

## Reverter

MASTER tira a tabela do scope no Workshop. Field `Visibilidade` e dados permanecem; filtro deixa de aplicar.
```

- [ ] **Step 2: Atualizar backend/extensions/CLAUDE.md**

Na seção "Tipos de extensão", após a tabela, adicionar:

```md
### Capability `kind` (extensões que mutam comportamento do core)

Plugins que não vivem em um slot UI mas alteram comportamento do core declaram `placement.kind`:

| kind | Descrição | Contrato |
|------|-----------|----------|
| `row-access-guard` | Modifica leitura/escrita de rows (filtros, guards) | `RowAccessGuard` em `application/core/extensions/row-access-guard.contract.ts` |

Catálogo de guards registrados vive em `application/core/extensions/row-access-guard.service.ts` (map `GUARDS`). Primeiro plugin: `core/plugins/visibility-by-role`.
```

- [ ] **Step 3: Commit**

```bash
git add backend/extensions/
git commit -m "docs: README do plugin Visibilidade + capability kind no CLAUDE.md"
```

---

## Task 22: Smoke E2E manual

**Sem código** — checklist manual com docker compose up.

- [ ] **Step 1: Boot stack**

```bash
docker compose up -d
docker exec -it low-code-js-api npm run seed
```

- [ ] **Step 2: Criar tabela de teste e usuários**

Via UI (`/tables/create`): criar "Processos" com 1 field "Titulo" (TEXT_SHORT).

Via `/users`: criar 1 MANAGER (`manager@x`) e usar o MASTER do setup wizard.

- [ ] **Step 3: Ativar plugin**

Logar como MASTER → `/extensions` → toggle ON em "Visibilidade por Papel" → Configurar → selecionar "Processos" → Salvar.

Verificar:
- ✅ Field "Visibilidade" apareceu na tabela Processos
- ✅ Sem erros

- [ ] **Step 4: Criar registros**

Como MASTER, criar 2 rows: "PROC-001" (PUBLIC) e "PROC-002" (SIGILOSO).

- [ ] **Step 5: Validar visualização**

- Logar como MANAGER → /tables/processos: deve ver só PROC-001 (1 row)
- Acessar URL direta de PROC-002 → 403 Forbidden
- Tentar criar nova row com visibility SIGILOSO → form salva como PUBLIC (sanitizado)
- Logar de volta como MASTER → vê os 2 rows

- [ ] **Step 6: Reverter**

MASTER tira Processos do scope → MANAGER passa a ver os 2 rows. Field Visibilidade continua na tabela.

- [ ] **Step 7: Commit (opcional — print de tela ou notas)**

Nenhum commit obrigatório. Se houver bugs, abrir tasks novas neste plano.

---

## Self-review notes

**Spec coverage check:**

| Spec §  | Coberto em | OK |
|--------|------------|------|
| §3.1 Camadas | Tasks 1–8, 15–20 | ✓ |
| §3.2 Contrato RowAccessGuard | Task 3 | ✓ |
| §3.3 GuardService | Task 5 | ✓ |
| §3.4 Implementação VisibilityByRoleGuard | Tasks 6–7 | ✓ |
| §3.5 Row use-cases | Tasks 10–14 | ✓ |
| §3.6 Frontend | Tasks 18–20 | ✓ |
| §3.7 Exceptions | Embutido nas tasks (HTTPException.Forbidden com cause customizado) | ✓ |
| §4 Fluxos | Implícito nas tasks | ✓ |
| §5 Edge cases | Backfill (Task 7), conflito (Task 7), scope=all (Task 9), pluginKey desconhecido (Task 5) | ✓ |
| §6 Índices | Task 15 | ✓ |
| §7 Testes | Distribuídos em cada task | ✓ |
| §10 Integração com Luan | Branch já criada baseada em feat/extensions; Tasks rebasam livremente | ✓ |

**Limitações conhecidas no plano:**

1. **Trash/bulk operations não cobertas.** `send-to-trash`, `bulk-trash` etc. seguem mesma lógica do delete/update. Adicionar como Tasks 23+ se cliente pedir.
2. **export-csv não cobre filtro.** Listar Sigilosos em CSV vaza dados. Adicionar como follow-up.
3. **Caminho do alias `@/extensions/...`** pode não estar configurado no tsconfig do backend — checar e ajustar pra `../../../extensions/...` se preciso.
4. **Race no toggle off durante request:** aceito (snapshot no início do request). Sem locking.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-20-plugin-visibility-by-role-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - dispatch fresh subagent per task, review between, fast iteration

**2. Inline Execution** - executar as tasks nesta sessão usando executing-plans, batch execution com checkpoints

**Qual abordagem?**
