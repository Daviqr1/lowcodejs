import { beforeEach, describe, expect, it } from 'vitest';

import { E_EXTENSION_TYPE } from '@application/core/entity.core';
import ExtensionInMemoryRepository from '@application/repositories/extension/extension-in-memory.repository';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';

import { injectRowAccessGuardDeps } from '../../../../extensions/core/plugins/row-access/guard';
import TableSchemaInMemoryService from '@application/services/table-schema/table-schema-in-memory.service';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';

import BulkConfigureTableSettingsUseCase from './bulk-configure-table-settings.use-case';
import { DEFAULT_ROW_ACCESS_SETTINGS } from '../../../../extensions/core/plugins/row-access/settings-schema';

describe('BulkConfigureTableSettingsUseCase', () => {
  let extensionRepo: ExtensionInMemoryRepository;
  let tableRepo: TableInMemoryRepository;
  let fieldRepo: FieldInMemoryRepository;
  let rowRepo: RowInMemoryRepository;
  let useCase: BulkConfigureTableSettingsUseCase;
  let extensionId: string;
  let createdAt: Date;

  beforeEach(async () => {
    extensionRepo = new ExtensionInMemoryRepository();
    tableRepo = new TableInMemoryRepository();
    fieldRepo = new FieldInMemoryRepository();
    rowRepo = new RowInMemoryRepository();

    // Garante que o guard tem as deps
    injectRowAccessGuardDeps({
      fieldRepo,
      tableRepo,
      rowRepo,
      tableSchemaService: new TableSchemaInMemoryService(),
    });
    // Service não usado diretamente — usado pra registrar
    new RowAccessGuardService(extensionRepo);

    useCase = new BulkConfigureTableSettingsUseCase(
      extensionRepo,
      tableRepo,
      fieldRepo,
    );

    const ext = await extensionRepo.upsert({
      pkg: 'core',
      type: E_EXTENSION_TYPE.PLUGIN,
      extensionId: 'row-access',
      name: 'Row Access',
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
    await extensionRepo.toggleEnabled({ _id: ext._id, enabled: true });
    extensionId = ext._id;
    createdAt = ext.updatedAt!;

    await tableRepo.create({
      name: 'T1',
      slug: 't1',
      owner: 'u1',
      fields: [],
    });
    await tableRepo.create({
      name: 'T2',
      slug: 't2',
      owner: 'u1',
      fields: [],
    });
  });

  it('aplica config em 2 tabelas: success.length=2, failed.length=0', async () => {
    const [t1, t2] = await tableRepo.findMany();

    const result = await useCase.execute({
      _id: extensionId,
      tableIds: [t1._id, t2._id],
      settings: DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<
        string,
        unknown
      >,
      expectedUpdatedAt: createdAt,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.success).toHaveLength(2);
      expect(result.value.failed).toHaveLength(0);
      expect(result.value.extension.tableSettings?.[t1._id]).toBeDefined();
      expect(result.value.extension.tableScope.tableIds).toContain(t1._id);
      expect(result.value.extension.tableScope.tableIds).toContain(t2._id);
    }
  });

  it('tableId inexistente: aparece em failed[]', async () => {
    const [t1] = await tableRepo.findMany();

    const result = await useCase.execute({
      _id: extensionId,
      tableIds: [t1._id, 'inexistente-id'],
      settings: DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<
        string,
        unknown
      >,
      expectedUpdatedAt: createdAt,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.success).toEqual([t1._id]);
      expect(result.value.failed).toHaveLength(1);
      expect(result.value.failed[0].reason).toBe('TABLE_NOT_FOUND');
    }
  });

  it('todas falham: retorna Left BULK_ALL_FAILED', async () => {
    const result = await useCase.execute({
      _id: extensionId,
      tableIds: ['nope1', 'nope2'],
      settings: DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<
        string,
        unknown
      >,
      expectedUpdatedAt: createdAt,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.cause).toBe('BULK_ALL_FAILED');
    }
  });

  it('expectedUpdatedAt errado: retorna 409 Conflict', async () => {
    const [t1] = await tableRepo.findMany();
    const stale = new Date(Date.now() - 999999);

    const result = await useCase.execute({
      _id: extensionId,
      tableIds: [t1._id],
      settings: DEFAULT_ROW_ACCESS_SETTINGS as unknown as Record<
        string,
        unknown
      >,
      expectedUpdatedAt: stale,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(409);
      expect(result.value.cause).toBe('ROW_GUARD_SETTINGS_CONFLICT');
    }
  });

  it('extension inexistente: 404', async () => {
    const result = await useCase.execute({
      _id: 'nope',
      tableIds: ['t1'],
      settings: {},
      expectedUpdatedAt: createdAt,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('EXTENSION_NOT_FOUND');
    }
  });

  it('settings inválido (não passa Zod): retorna BadRequest', async () => {
    const [t1] = await tableRepo.findMany();

    const result = await useCase.execute({
      _id: extensionId,
      tableIds: [t1._id],
      // Settings malformado: visibility values com apenas 1 valor (min 2)
      settings: {
        visibility: {
          enabled: true,
          fieldSlug: 'visibility',
          values: ['ONLY'],
          roleMatrix: { ONLY: ['MASTER', 'ADMINISTRATOR'] },
          defaultValue: 'ONLY',
        },
        creatorBypass: { enabled: false },
        dateWindow: { mode: 'off' },
      },
      expectedUpdatedAt: createdAt,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.cause).toBe('ROW_GUARD_SETTINGS_INVALID');
    }
  });
});
