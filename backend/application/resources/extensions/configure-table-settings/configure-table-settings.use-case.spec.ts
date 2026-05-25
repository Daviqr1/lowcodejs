import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

import { right, left } from '@application/core/either.core';
import { E_EXTENSION_TYPE } from '@application/core/entity.core';
import type { ITable, IJWTPayload, IRow } from '@application/core/entity.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import type {
  RowAccessGuard,
  GuardAccessDecision,
  GuardWriteDecision,
} from '@application/core/extensions/row-access-guard.contract';
import HTTPException from '@application/core/exception.core';
import ExtensionInMemoryRepository from '@application/repositories/extension/extension-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import type { ExtensionUpsertPayload } from '@application/repositories/extension/extension-contract.repository';

import ExtensionConfigureTableSettingsUseCase from './configure-table-settings.use-case';

// ── TestGuard com settingsSchema e onTableBound controlável ──────────────────

const testSettingsSchema = z.object({ slidingDays: z.number().int().positive() });

let onTableBoundShouldFail = false;

const TestGuard: RowAccessGuard = {
  pluginKey: 'test:test-guard',
  category: 'restrictive',
  supportsScopeAll: true,
  settingsSchema: testSettingsSchema,

  async onTableBound(_table: ITable, _settings: Record<string, unknown>) {
    if (onTableBoundShouldFail) {
      return left(
        HTTPException.BadRequest('onTableBound falhou', 'BIND_FAILED'),
      );
    }
    return right({ wasCreated: false });
  },

  adjustListQuery(
    _query: Record<string, unknown>,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _settings: Record<string, unknown>,
  ): Record<string, unknown> {
    return {};
  },

  canRead(
    _row: IRow,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _settings: Record<string, unknown>,
  ): GuardAccessDecision {
    return 'abstain';
  },

  canWrite(
    _row: IRow | null,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _payload: Record<string, unknown> | null,
    _operation: 'create' | 'update' | 'delete',
    _settings: Record<string, unknown>,
  ): GuardWriteDecision {
    return { decision: 'abstain' };
  },

  sanitizeWritePayload(
    payload: Record<string, unknown>,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _operation: 'create' | 'update',
    _currentRow: IRow | null,
    _settings: Record<string, unknown>,
  ): Record<string, unknown> {
    return payload;
  },
};

// ── Guard sem settingsSchema ─────────────────────────────────────────────────

const SimpleGuard: RowAccessGuard = {
  pluginKey: 'test:simple-guard',
  category: 'restrictive',
  supportsScopeAll: true,

  async onTableBound(_table: ITable, _settings: Record<string, unknown>) {
    return right({ wasCreated: false });
  },

  adjustListQuery(
    _query: Record<string, unknown>,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _settings: Record<string, unknown>,
  ): Record<string, unknown> {
    return {};
  },

  canRead(
    _row: IRow,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _settings: Record<string, unknown>,
  ): GuardAccessDecision {
    return 'abstain';
  },

  canWrite(
    _row: IRow | null,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _payload: Record<string, unknown> | null,
    _operation: 'create' | 'update' | 'delete',
    _settings: Record<string, unknown>,
  ): GuardWriteDecision {
    return { decision: 'abstain' };
  },

  sanitizeWritePayload(
    payload: Record<string, unknown>,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _operation: 'create' | 'update',
    _currentRow: IRow | null,
    _settings: Record<string, unknown>,
  ): Record<string, unknown> {
    return payload;
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const baseUpsert = (extensionId: string, pkg = 'test'): ExtensionUpsertPayload => ({
  pkg,
  type: E_EXTENSION_TYPE.PLUGIN,
  extensionId,
  name: 'Test Guard Plugin',
  description: null,
  version: '1.0.0',
  author: null,
  icon: null,
  image: null,
  slot: null,
  route: null,
  submenu: null,
  manifestSnapshot: {},
  requires: { lowcodejs: undefined, extensions: [] },
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ExtensionConfigureTableSettingsUseCase', () => {
  let extensionRepo: ExtensionInMemoryRepository;
  let tableRepo: TableInMemoryRepository;
  let useCase: ExtensionConfigureTableSettingsUseCase;
  let extensionId: string;
  let tableId: string;

  beforeEach(async () => {
    onTableBoundShouldFail = false;

    // Registra guards para os testes
    RowAccessGuardService.register(TestGuard.pluginKey, TestGuard);
    RowAccessGuardService.register(SimpleGuard.pluginKey, SimpleGuard);

    extensionRepo = new ExtensionInMemoryRepository();
    tableRepo = new TableInMemoryRepository();

    useCase = new ExtensionConfigureTableSettingsUseCase(
      extensionRepo,
      tableRepo,
    );

    // Cria extension
    await extensionRepo.upsert(baseUpsert('test-guard'));
    const [ext] = await extensionRepo.findMany();
    extensionId = ext._id;

    // Cria tabela
    const table = await tableRepo.create({ name: 'T1', slug: 't1', owner: 'u1', fields: [] });
    tableId = table._id;
  });

  it('sucesso: settings válidos e onTableBound right → persiste e retorna extension', async () => {
    const ext = await extensionRepo.findById(extensionId);
    const expectedUpdatedAt = ext!.updatedAt!;

    const result = await useCase.execute({
      _id: extensionId,
      tableId,
      settings: { slidingDays: 30 },
      expectedUpdatedAt,
    });

    expect(result.isRight()).toBe(true);
    const updated = result.value as ReturnType<typeof right>['value'];
    const stored = await extensionRepo.findById(extensionId);
    expect(stored?.tableSettings?.[tableId]).toEqual({ slidingDays: 30 });
  });

  it('settings inválidos pelo Zod → Left ROW_GUARD_SETTINGS_INVALID 400', async () => {
    const ext = await extensionRepo.findById(extensionId);
    const expectedUpdatedAt = ext!.updatedAt!;

    const result = await useCase.execute({
      _id: extensionId,
      tableId,
      settings: { slidingDays: 'nao-numero' }, // inválido
      expectedUpdatedAt,
    });

    expect(result.isLeft()).toBe(true);
    const error = result.value as HTTPException;
    expect(error.code).toBe(400);
    expect(error.cause).toBe('ROW_GUARD_SETTINGS_INVALID');
  });

  it('onTableBound retorna Left → Left ROW_GUARD_BIND_FAILED', async () => {
    onTableBoundShouldFail = true;
    const ext = await extensionRepo.findById(extensionId);
    const expectedUpdatedAt = ext!.updatedAt!;

    const result = await useCase.execute({
      _id: extensionId,
      tableId,
      settings: { slidingDays: 7 },
      expectedUpdatedAt,
    });

    expect(result.isLeft()).toBe(true);
    const error = result.value as HTTPException;
    expect(error.cause).toBe('ROW_GUARD_BIND_FAILED');
  });

  it('optimistic lock conflict (updateTableSettings retorna null) → Left ROW_GUARD_SETTINGS_CONFLICT 409', async () => {
    // expectedUpdatedAt incorreto → conflito
    const result = await useCase.execute({
      _id: extensionId,
      tableId,
      settings: { slidingDays: 7 },
      expectedUpdatedAt: new Date('2000-01-01T00:00:00.000Z'), // data errada
    });

    expect(result.isLeft()).toBe(true);
    const error = result.value as HTTPException;
    expect(error.code).toBe(409);
    expect(error.cause).toBe('ROW_GUARD_SETTINGS_CONFLICT');
  });

  it('extension não existe → Left NOT_FOUND', async () => {
    const result = await useCase.execute({
      _id: 'id-inexistente',
      tableId,
      settings: { slidingDays: 7 },
      expectedUpdatedAt: new Date(),
    });

    expect(result.isLeft()).toBe(true);
    const error = result.value as HTTPException;
    expect(error.code).toBe(404);
    expect(error.cause).toBe('EXTENSION_NOT_FOUND');
  });

  it('tabela não existe → Left TABLE_NOT_FOUND', async () => {
    const ext = await extensionRepo.findById(extensionId);
    const expectedUpdatedAt = ext!.updatedAt!;

    const result = await useCase.execute({
      _id: extensionId,
      tableId: 'tabela-inexistente',
      settings: { slidingDays: 7 },
      expectedUpdatedAt,
    });

    expect(result.isLeft()).toBe(true);
    const error = result.value as HTTPException;
    expect(error.code).toBe(404);
    expect(error.cause).toBe('TABLE_NOT_FOUND');
  });

  it('guard sem settingsSchema → aceita qualquer settings sem validação Zod', async () => {
    // Cria extension com simple-guard (sem settingsSchema)
    await extensionRepo.upsert(baseUpsert('simple-guard'));
    const allExts = await extensionRepo.findMany();
    const simpleExt = allExts.find((e) => e.extensionId === 'simple-guard')!;
    const expectedUpdatedAt = simpleExt.updatedAt!;

    const result = await useCase.execute({
      _id: simpleExt._id,
      tableId,
      settings: { qualquerCoisa: 'sem-schema' },
      expectedUpdatedAt,
    });

    expect(result.isRight()).toBe(true);
    const stored = await extensionRepo.findById(simpleExt._id);
    expect(stored?.tableSettings?.[tableId]).toEqual({ qualquerCoisa: 'sem-schema' });
  });
});
