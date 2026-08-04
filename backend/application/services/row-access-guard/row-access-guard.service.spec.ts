// Specs constroem mocks parciais de entidades do domínio via asserção; tipá-los
// por completo aqui seria só ruído de teste.
import { describe, it, expect, beforeEach } from 'vitest';

import { right } from '@application/core/either.core';
import type { Either } from '@application/core/either.core';
import { E_EXTENSION_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import type {
  GuardAccessDecision,
  GuardBindResult,
  GuardEvalContext,
  GuardWriteDecision,
  RowAccessGuard,
} from '@application/core/row-access-guard.contract';
import { makeRow, makeTable } from '@application/repositories/entity-fixtures';
import type { ExtensionUpsertPayload } from '@application/repositories/extension/extension-contract.repository';
import ExtensionInMemoryRepository from '@application/repositories/extension/extension-in-memory.repository';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import InMemoryModelBuilder from '@application/services/table/in-memory-model-builder.service';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';
import { RowAccessControlGuard } from '@extensions/core/plugins/row-access/guard';

import RowAccessGuardService from './row-access-guard.service';

function makeRowAccessControlGuard(): RowAccessControlGuard {
  return new RowAccessControlGuard(
    new FieldInMemoryRepository(),
    new TableInMemoryRepository(),
    new RowInMemoryRepository(),
    new InMemorySchemaBuilder(),
    new InMemoryModelBuilder(),
  );
}

// Dummy GroupResolver — nenhum usuario é privilegiado nos testes de compose
class DummyGroupResolver extends GroupResolverContractService {
  async resolveUserGroupIds(): Promise<Set<string>> {
    return new Set();
  }
  async resolveCapabilities(): Promise<Set<string>> {
    return new Set();
  }
  async isPrivileged(): Promise<boolean> {
    return false;
  }
  async isMaster(): Promise<boolean> {
    return false;
  }
  async shouldHideMaster(): Promise<boolean> {
    return false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const baseUpsert = (
  extensionId: string,
  pkg = 'core',
): ExtensionUpsertPayload => ({
  pkg,
  type: E_EXTENSION_TYPE.PLUGIN,
  extensionId,
  name: 'X',
  description: null,
  version: '1.0.0',
  author: null,
  icon: null,
  image: null,
  slots: [],
  route: null,
  configRoute: null,
  submenu: null,
  manifestSnapshot: {},
  requires: { lowcodejs: undefined, extensions: [] },
  permissions: { view: [] },
});

const FAKE_TABLE = makeTable({ _id: 'T1' });
const FAKE_ROW = makeRow({ _id: 'R1', creator: 'u1' });

function makeCtx(
  groupIds: string[] = [],
  userId = 'u1',
  isPrivileged = false,
): GuardEvalContext {
  return {
    user: undefined,
    userId,
    groupIds: new Set(groupIds),
    isPrivileged,
  };
}

function makePrivilegedCtx(): GuardEvalContext {
  return makeCtx([], 'u1', true);
}

/** Registra a extensão no repo e a ativa para a tableId dada. */
async function activatePlugin(
  repo: ExtensionInMemoryRepository,
  pluginKey: string,
  tableId: string,
): Promise<void> {
  const [pkg, extensionId] = pluginKey.split(':');
  await repo.upsert(baseUpsert(extensionId, pkg));
  const all = await repo.findMany();
  const ext = all.find((e) => e.extensionId === extensionId && e.pkg === pkg)!;
  await repo.toggleEnabled({ _id: ext._id, enabled: true });
  await repo.updateTableScope({
    _id: ext._id,
    tableScope: { mode: 'specific', tableIds: [tableId] },
  });
}

// ── Fake guards ───────────────────────────────────────────────────────────────

function makeRestrictiveGuard(
  key: string,
  fragment: Record<string, unknown>,
  readDecision: GuardAccessDecision = 'abstain',
  writeDecision: GuardWriteDecision = { decision: 'abstain' },
  sanitizeFn?: (payload: Record<string, unknown>) => Record<string, unknown>,
): RowAccessGuard {
  return {
    pluginKey: key,
    category: 'restrictive',
    supportsScopeAll: true,
    settingsSchema: undefined,

    onTableBound(): Promise<Either<HTTPException, GuardBindResult>> {
      return Promise.resolve(right({ wasCreated: false }));
    },

    adjustListQuery(): Record<string, unknown> {
      return fragment;
    },

    canRead(): GuardAccessDecision {
      return readDecision;
    },

    canWrite(): GuardWriteDecision {
      return writeDecision;
    },

    sanitizeWritePayload(
      payload: Record<string, unknown>,
    ): Record<string, unknown> {
      if (sanitizeFn) return sanitizeFn(payload);
      return payload;
    },
  };
}

function makePermissiveGuard(
  key: string,
  fragment: Record<string, unknown>,
  readDecision: GuardAccessDecision = 'abstain',
  writeDecision: GuardWriteDecision = { decision: 'abstain' },
): RowAccessGuard {
  return {
    pluginKey: key,
    category: 'permissive',
    supportsScopeAll: true,
    settingsSchema: undefined,

    onTableBound(): Promise<Either<HTTPException, GuardBindResult>> {
      return Promise.resolve(right({ wasCreated: false }));
    },

    adjustListQuery(): Record<string, unknown> {
      return fragment;
    },

    canRead(): GuardAccessDecision {
      return readDecision;
    },

    canWrite(): GuardWriteDecision {
      return writeDecision;
    },

    sanitizeWritePayload(
      _payload: Record<string, unknown>,
    ): Record<string, unknown> {
      return _payload;
    },
  };
}

// ── composeListQuery ──────────────────────────────────────────────────────────

describe('RowAccessGuardService.composeListQuery', () => {
  let extensionRepo: ExtensionInMemoryRepository;
  let service: RowAccessGuardService;
  const TABLE_ID = 'T1';
  const BASE_QUERY = { trashed: false };

  beforeEach(() => {
    extensionRepo = new ExtensionInMemoryRepository();
    service = new RowAccessGuardService(
      extensionRepo,
      new UserInMemoryRepository(),
      new DummyGroupResolver(),
      makeRowAccessControlGuard(),
    );
  });

  it('privilegiado → retorna baseQuery inalterada, nao chama guards', async () => {
    const restrictive = makeRestrictiveGuard('fake:r1', {
      visibility: 'PUBLIC',
    });
    RowAccessGuardService.register(restrictive.pluginKey, restrictive);
    await activatePlugin(extensionRepo, restrictive.pluginKey, TABLE_ID);

    const result = await service.composeListQuery(
      TABLE_ID,
      BASE_QUERY,
      makePrivilegedCtx(),
      FAKE_TABLE,
    );

    expect(result).toEqual(BASE_QUERY);
    expect(result).not.toHaveProperty('$and');
  });

  it('sem guards ativos → retorna baseQuery inalterada', async () => {
    const result = await service.composeListQuery(
      TABLE_ID,
      BASE_QUERY,
      makeCtx(['g1']),
      FAKE_TABLE,
    );

    expect(result).toEqual(BASE_QUERY);
  });

  it('1 restrictive com fragmento → retorna baseQuery + $and com fragmento', async () => {
    const guard = makeRestrictiveGuard('fake:r-one', { visibility: 'PUBLIC' });
    RowAccessGuardService.register(guard.pluginKey, guard);
    await activatePlugin(extensionRepo, guard.pluginKey, TABLE_ID);

    const result = await service.composeListQuery(
      TABLE_ID,
      BASE_QUERY,
      makeCtx(['g1']),
      FAKE_TABLE,
    );

    expect(result).toEqual({
      ...BASE_QUERY,
      $and: [{ visibility: 'PUBLIC' }],
    });
  });

  it('2 restrictive → retorna baseQuery + $and com ambos fragmentos', async () => {
    const g1 = makeRestrictiveGuard('fake:r-two-a', { visibility: 'PUBLIC' });
    const g2 = makeRestrictiveGuard('fake:r-two-b', { active: true });
    RowAccessGuardService.register(g1.pluginKey, g1);
    RowAccessGuardService.register(g2.pluginKey, g2);
    await activatePlugin(extensionRepo, g1.pluginKey, TABLE_ID);
    await activatePlugin(extensionRepo, g2.pluginKey, TABLE_ID);

    const result = await service.composeListQuery(
      TABLE_ID,
      BASE_QUERY,
      makeCtx(['g1']),
      FAKE_TABLE,
    );

    const and = result['$and'];
    expect(and).toHaveLength(2);
    expect(and).toContainEqual({ visibility: 'PUBLIC' });
    expect(and).toContainEqual({ active: true });
  });

  it('1 permissive com fragmento → retorna $or com [base, base+permissive]', async () => {
    const g = makePermissiveGuard('fake:p-one', { creator: 'u1' });
    RowAccessGuardService.register(g.pluginKey, g);
    await activatePlugin(extensionRepo, g.pluginKey, TABLE_ID);

    const result = await service.composeListQuery(
      TABLE_ID,
      BASE_QUERY,
      makeCtx(['g1']),
      FAKE_TABLE,
    );

    expect(result).toEqual({
      $or: [BASE_QUERY, { ...BASE_QUERY, creator: 'u1' }],
    });
  });

  it('mix restrictive + permissive → $or com [restrictedBase, base+permissive]', async () => {
    const r = makeRestrictiveGuard('fake:r-mix', { visibility: 'PUBLIC' });
    const p = makePermissiveGuard('fake:p-mix', { creator: 'u1' });
    RowAccessGuardService.register(r.pluginKey, r);
    RowAccessGuardService.register(p.pluginKey, p);
    await activatePlugin(extensionRepo, r.pluginKey, TABLE_ID);
    await activatePlugin(extensionRepo, p.pluginKey, TABLE_ID);

    const result = await service.composeListQuery(
      TABLE_ID,
      BASE_QUERY,
      makeCtx(['g1']),
      FAKE_TABLE,
    );

    const restricted = { ...BASE_QUERY, $and: [{ visibility: 'PUBLIC' }] };
    expect(result).toEqual({
      $or: [restricted, { ...BASE_QUERY, creator: 'u1' }],
    });
  });

  it('permissive retornando {} (sentinel) → fragmento filtrado, query igual a apenas restrictive', async () => {
    const r = makeRestrictiveGuard('fake:r-sent', { visibility: 'PUBLIC' });
    const p = makePermissiveGuard('fake:p-sent', {});
    RowAccessGuardService.register(r.pluginKey, r);
    RowAccessGuardService.register(p.pluginKey, p);
    await activatePlugin(extensionRepo, r.pluginKey, TABLE_ID);
    await activatePlugin(extensionRepo, p.pluginKey, TABLE_ID);

    const result = await service.composeListQuery(
      TABLE_ID,
      BASE_QUERY,
      makeCtx(['g1']),
      FAKE_TABLE,
    );

    expect(result).toEqual({
      ...BASE_QUERY,
      $and: [{ visibility: 'PUBLIC' }],
    });
    expect(result).not.toHaveProperty('$or');
  });

  it('baseQuery ja tem $and → restrictive faz append ao $and existente', async () => {
    const existingAnd = [{ trashed: false }];
    const baseWithAnd: Record<string, unknown> = {
      status: 'active',
      $and: existingAnd,
    };
    const r = makeRestrictiveGuard('fake:r-and', { visibility: 'PUBLIC' });
    RowAccessGuardService.register(r.pluginKey, r);
    await activatePlugin(extensionRepo, r.pluginKey, TABLE_ID);

    const result = await service.composeListQuery(
      TABLE_ID,
      baseWithAnd,
      makeCtx(['g1']),
      FAKE_TABLE,
    );

    const and = result['$and'];
    expect(and).toContainEqual({ trashed: false });
    expect(and).toContainEqual({ visibility: 'PUBLIC' });
    expect(and).toHaveLength(2);
  });
});

// ── composeReadDecision ───────────────────────────────────────────────────────

describe('RowAccessGuardService.composeReadDecision', () => {
  let extensionRepo: ExtensionInMemoryRepository;
  let service: RowAccessGuardService;
  const TABLE_ID = 'T1';

  beforeEach(() => {
    extensionRepo = new ExtensionInMemoryRepository();
    service = new RowAccessGuardService(
      extensionRepo,
      new UserInMemoryRepository(),
      new DummyGroupResolver(),
      makeRowAccessControlGuard(),
    );
  });

  it('privilegiado → true sem consultar guards', async () => {
    const deny = makeRestrictiveGuard('fake:rd-deny', {}, 'deny');
    RowAccessGuardService.register(deny.pluginKey, deny);
    await activatePlugin(extensionRepo, deny.pluginKey, TABLE_ID);

    const result = await service.composeReadDecision(
      TABLE_ID,
      FAKE_ROW,
      makePrivilegedCtx(),
      FAKE_TABLE,
    );

    expect(result).toBe(true);
  });

  it('todos abstain → true (default-allow)', async () => {
    const g = makeRestrictiveGuard('fake:rd-abs', {}, 'abstain');
    RowAccessGuardService.register(g.pluginKey, g);
    await activatePlugin(extensionRepo, g.pluginKey, TABLE_ID);

    const result = await service.composeReadDecision(
      TABLE_ID,
      FAKE_ROW,
      makeCtx(['g1']),
      FAKE_TABLE,
    );

    expect(result).toBe(true);
  });

  it('sem guards → true', async () => {
    const result = await service.composeReadDecision(
      TABLE_ID,
      FAKE_ROW,
      makeCtx(['g1']),
      FAKE_TABLE,
    );

    expect(result).toBe(true);
  });

  it('1 allow + 1 deny → true (allow vence)', async () => {
    const allow = makePermissiveGuard('fake:rd-allow', {}, 'allow');
    const deny = makeRestrictiveGuard('fake:rd-deny2', {}, 'deny');
    RowAccessGuardService.register(allow.pluginKey, allow);
    RowAccessGuardService.register(deny.pluginKey, deny);
    await activatePlugin(extensionRepo, allow.pluginKey, TABLE_ID);
    await activatePlugin(extensionRepo, deny.pluginKey, TABLE_ID);

    const result = await service.composeReadDecision(
      TABLE_ID,
      FAKE_ROW,
      makeCtx(['g1']),
      FAKE_TABLE,
    );

    expect(result).toBe(true);
  });

  it('so deny → false', async () => {
    const deny = makeRestrictiveGuard('fake:rd-onlydeny', {}, 'deny');
    RowAccessGuardService.register(deny.pluginKey, deny);
    await activatePlugin(extensionRepo, deny.pluginKey, TABLE_ID);

    const result = await service.composeReadDecision(
      TABLE_ID,
      FAKE_ROW,
      makeCtx(['g1']),
      FAKE_TABLE,
    );

    expect(result).toBe(false);
  });

  it('so abstain → true', async () => {
    const abs = makeRestrictiveGuard('fake:rd-absonly', {}, 'abstain');
    RowAccessGuardService.register(abs.pluginKey, abs);
    await activatePlugin(extensionRepo, abs.pluginKey, TABLE_ID);

    const result = await service.composeReadDecision(
      TABLE_ID,
      FAKE_ROW,
      makeCtx(['g1']),
      FAKE_TABLE,
    );

    expect(result).toBe(true);
  });
});

// ── composeWriteDecision ──────────────────────────────────────────────────────

describe('RowAccessGuardService.composeWriteDecision', () => {
  let extensionRepo: ExtensionInMemoryRepository;
  let service: RowAccessGuardService;
  const TABLE_ID = 'T1';

  beforeEach(() => {
    extensionRepo = new ExtensionInMemoryRepository();
    service = new RowAccessGuardService(
      extensionRepo,
      new UserInMemoryRepository(),
      new DummyGroupResolver(),
      makeRowAccessControlGuard(),
    );
  });

  it('privilegiado → { decision: allow }', async () => {
    const deny = makeRestrictiveGuard('fake:wd-adm', {}, 'abstain', {
      decision: 'deny',
      reason: 'BLOCKED',
    });
    RowAccessGuardService.register(deny.pluginKey, deny);
    await activatePlugin(extensionRepo, deny.pluginKey, TABLE_ID);

    const result = await service.composeWriteDecision(
      TABLE_ID,
      FAKE_ROW,
      makePrivilegedCtx(),
      FAKE_TABLE,
      {},
      'update',
    );

    expect(result).toEqual({ decision: 'allow' });
  });

  it('1 permissive allow + 1 restrictive deny → { decision: allow }', async () => {
    const allow = makePermissiveGuard('fake:wd-pmallow', {}, 'abstain', {
      decision: 'allow',
    });
    const deny = makeRestrictiveGuard('fake:wd-rdeny', {}, 'abstain', {
      decision: 'deny',
      reason: 'BLOCKED',
    });
    RowAccessGuardService.register(allow.pluginKey, allow);
    RowAccessGuardService.register(deny.pluginKey, deny);
    await activatePlugin(extensionRepo, allow.pluginKey, TABLE_ID);
    await activatePlugin(extensionRepo, deny.pluginKey, TABLE_ID);

    const result = await service.composeWriteDecision(
      TABLE_ID,
      FAKE_ROW,
      makeCtx(['g1']),
      FAKE_TABLE,
      {},
      'update',
    );

    expect(result).toEqual({ decision: 'allow' });
  });

  it('so deny → { decision: deny, reason: primeiro reason }', async () => {
    const deny1 = makeRestrictiveGuard('fake:wd-d1', {}, 'abstain', {
      decision: 'deny',
      reason: 'FIRST_REASON',
    });
    const deny2 = makeRestrictiveGuard('fake:wd-d2', {}, 'abstain', {
      decision: 'deny',
      reason: 'SECOND_REASON',
    });
    RowAccessGuardService.register(deny1.pluginKey, deny1);
    RowAccessGuardService.register(deny2.pluginKey, deny2);
    await activatePlugin(extensionRepo, deny1.pluginKey, TABLE_ID);
    await activatePlugin(extensionRepo, deny2.pluginKey, TABLE_ID);

    const result = await service.composeWriteDecision(
      TABLE_ID,
      FAKE_ROW,
      makeCtx(['g1']),
      FAKE_TABLE,
      {},
      'update',
    );

    expect(result.decision).toBe('deny');
    if (result.decision === 'deny') {
      expect(['FIRST_REASON', 'SECOND_REASON']).toContain(result.reason);
    }
  });

  it('so abstain → { decision: allow }', async () => {
    const abs = makeRestrictiveGuard('fake:wd-abs', {}, 'abstain', {
      decision: 'abstain',
    });
    RowAccessGuardService.register(abs.pluginKey, abs);
    await activatePlugin(extensionRepo, abs.pluginKey, TABLE_ID);

    const result = await service.composeWriteDecision(
      TABLE_ID,
      FAKE_ROW,
      makeCtx(['g1']),
      FAKE_TABLE,
      {},
      'create',
    );

    expect(result).toEqual({ decision: 'allow' });
  });

  it('sem guards → { decision: allow }', async () => {
    const result = await service.composeWriteDecision(
      TABLE_ID,
      null,
      makeCtx(['g1']),
      FAKE_TABLE,
      {},
      'create',
    );

    expect(result).toEqual({ decision: 'allow' });
  });
});

// ── composeSanitize ───────────────────────────────────────────────────────────

describe('RowAccessGuardService.composeSanitize', () => {
  let extensionRepo: ExtensionInMemoryRepository;
  let service: RowAccessGuardService;
  const TABLE_ID = 'T1';
  const BASE_PAYLOAD = { name: 'doc', x: 'keep-x', y: 'keep-y' };

  beforeEach(() => {
    extensionRepo = new ExtensionInMemoryRepository();
    service = new RowAccessGuardService(
      extensionRepo,
      new UserInMemoryRepository(),
      new DummyGroupResolver(),
      makeRowAccessControlGuard(),
    );
  });

  it('privilegiado → payload inalterado', async () => {
    const r = makeRestrictiveGuard(
      'fake:san-adm',
      {},
      'abstain',
      { decision: 'abstain' },
      (p) => ({ ...p, x: 'ZEROED' }),
    );
    RowAccessGuardService.register(r.pluginKey, r);
    await activatePlugin(extensionRepo, r.pluginKey, TABLE_ID);

    const result = await service.composeSanitize(
      TABLE_ID,
      BASE_PAYLOAD,
      makePrivilegedCtx(),
      FAKE_TABLE,
      'create',
      null,
    );

    expect(result).toEqual(BASE_PAYLOAD);
  });

  it('so permissive → payload inalterado (permissive nao sanitiza)', async () => {
    const p = makePermissiveGuard('fake:san-perm', {});
    RowAccessGuardService.register(p.pluginKey, p);
    await activatePlugin(extensionRepo, p.pluginKey, TABLE_ID);

    const result = await service.composeSanitize(
      TABLE_ID,
      BASE_PAYLOAD,
      makeCtx(['g1']),
      FAKE_TABLE,
      'update',
      null,
    );

    expect(result).toEqual(BASE_PAYLOAD);
  });

  it('so restrictive → sanitize aplicado em sequencia', async () => {
    const r1 = makeRestrictiveGuard(
      'fake:san-r1',
      {},
      'abstain',
      { decision: 'abstain' },
      (p) => ({ ...p, x: 'zeroed-by-r1' }),
    );
    const r2 = makeRestrictiveGuard(
      'fake:san-r2',
      {},
      'abstain',
      { decision: 'abstain' },
      (p) => ({ ...p, y: 'zeroed-by-r2' }),
    );
    RowAccessGuardService.register(r1.pluginKey, r1);
    RowAccessGuardService.register(r2.pluginKey, r2);
    await activatePlugin(extensionRepo, r1.pluginKey, TABLE_ID);
    await activatePlugin(extensionRepo, r2.pluginKey, TABLE_ID);

    const result = await service.composeSanitize(
      TABLE_ID,
      { ...BASE_PAYLOAD },
      makeCtx(['g1']),
      FAKE_TABLE,
      'create',
      null,
    );

    expect(result.x).toBe('zeroed-by-r1');
    expect(result.y).toBe('zeroed-by-r2');
  });

  it('ordem deterministica por pluginKey.localeCompare', async () => {
    const aGuard = makeRestrictiveGuard(
      'fake:a-guard',
      {},
      'abstain',
      { decision: 'abstain' },
      (p) => ({ ...p, x: 'by-a' }),
    );
    const bGuard = makeRestrictiveGuard(
      'fake:b-guard',
      {},
      'abstain',
      { decision: 'abstain' },
      (p) => ({ ...p, y: 'by-b' }),
    );
    RowAccessGuardService.register(aGuard.pluginKey, aGuard);
    RowAccessGuardService.register(bGuard.pluginKey, bGuard);

    await activatePlugin(extensionRepo, bGuard.pluginKey, TABLE_ID);
    await activatePlugin(extensionRepo, aGuard.pluginKey, TABLE_ID);

    const payload = { name: 'doc', x: 'orig-x', y: 'orig-y' };

    const result = await service.composeSanitize(
      TABLE_ID,
      { ...payload },
      makeCtx(['g1']),
      FAKE_TABLE,
      'create',
      null,
    );

    expect(result.x).toBe('by-a');
    expect(result.y).toBe('by-b');
  });

  it('sem guards → payload inalterado', async () => {
    const result = await service.composeSanitize(
      TABLE_ID,
      { ...BASE_PAYLOAD },
      makeCtx(['g1']),
      FAKE_TABLE,
      'create',
      null,
    );

    expect(result).toEqual(BASE_PAYLOAD);
  });
});
