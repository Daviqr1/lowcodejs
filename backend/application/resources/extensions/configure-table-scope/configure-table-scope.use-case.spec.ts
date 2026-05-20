import { describe, it, expect, beforeEach } from 'vitest';
import TableSchemaInMemoryService from '@application/services/table-schema/table-schema-in-memory.service';

import ExtensionConfigureTableScopeUseCase from './configure-table-scope.use-case';
import { E_EXTENSION_TYPE, E_FIELD_TYPE } from '@application/core/entity.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import {
  VisibilityByRoleGuard,
  injectVisibilityByRoleGuardDeps,
} from '../../../../extensions/core/plugins/visibility-by-role/guard';
import ExtensionInMemoryRepository from '@application/repositories/extension/extension-in-memory.repository';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import type { ExtensionUpsertPayload } from '@application/repositories/extension/extension-contract.repository';

const baseUpsert = (extensionId: string): ExtensionUpsertPayload => ({
  pkg: 'core',
  type: E_EXTENSION_TYPE.PLUGIN,
  extensionId,
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
  requires: { lowcodejs: undefined, extensions: [] },
});

describe('ExtensionConfigureTableScopeUseCase com guards', () => {
  let extensionRepo: ExtensionInMemoryRepository;
  let tableRepo: TableInMemoryRepository;
  let fieldRepo: FieldInMemoryRepository;
  let rowRepo: RowInMemoryRepository;
  let guardService: RowAccessGuardService;
  let useCase: ExtensionConfigureTableScopeUseCase;
  let extensionId: string;

  beforeEach(async () => {
    extensionRepo = new ExtensionInMemoryRepository();
    tableRepo = new TableInMemoryRepository();
    fieldRepo = new FieldInMemoryRepository();
    rowRepo = new RowInMemoryRepository();
    injectVisibilityByRoleGuardDeps({ fieldRepo, tableRepo, rowRepo, tableSchemaService: new TableSchemaInMemoryService() });
    RowAccessGuardService.register(VisibilityByRoleGuard.pluginKey, VisibilityByRoleGuard);
    guardService = new RowAccessGuardService(extensionRepo);
    useCase = new ExtensionConfigureTableScopeUseCase(
      extensionRepo,
      guardService,
      tableRepo,
      fieldRepo,
    );

    await extensionRepo.upsert(baseUpsert('visibility-by-role'));
    const [ext] = await extensionRepo.findMany();
    extensionId = ext._id;
    await extensionRepo.toggleEnabled({ _id: extensionId, enabled: true });

    await tableRepo.create({ name: 'T1', slug: 't1', owner: 'u1', fields: [] });
    await tableRepo.create({ name: 'T2', slug: 't2', owner: 'u1', fields: [] });
  });

  it('cria field Visibilidade em cada tabela do novo scope', async () => {
    const t1 = (await tableRepo.findMany({ search: 'T1' }))[0];
    const t2 = (await tableRepo.findMany({ search: 'T2' }))[0];

    const result = await useCase.execute({
      _id: extensionId,
      tableScope: { mode: 'specific', tableIds: [t1._id, t2._id] },
    });

    expect(result.isRight()).toBe(true);
    const allFields = await fieldRepo.findMany();
    const visFields = allFields.filter((f) => f.slug === 'visibility');
    expect(visFields).toHaveLength(2);

    // scope foi persistido
    const stored = await extensionRepo.findById(extensionId);
    expect(stored?.tableScope.tableIds).toHaveLength(2);
  });

  it('rollback: se 2a tabela tem field incompativel, 1a field e revertido e scope nao muda', async () => {
    const t1 = (await tableRepo.findMany({ search: 'T1' }))[0];
    const t2 = (await tableRepo.findMany({ search: 'T2' }))[0];

    // popular T2 com field visibility incompativel
    const incompat = await fieldRepo.create({
      name: 'Visibility legacy',
      slug: 'visibility',
      type: E_FIELD_TYPE.TEXT_SHORT,
      required: false,
      multiple: false,
      format: null,
      showInFilter: false,
      showInForm: false,
      showInDetail: false,
      showInList: false,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
      locked: false,
      native: false,
      defaultValue: null,
      relationship: null,
      dropdown: [],
      allowCustomDropdownOptions: false,
      category: [],
      group: null,
    });
    await tableRepo.update({ _id: t2._id, fields: [incompat._id] });

    const result = await useCase.execute({
      _id: extensionId,
      tableScope: { mode: 'specific', tableIds: [t1._id, t2._id] },
    });

    expect(result.isLeft()).toBe(true);
    expect((result.value as any).code).toBe(409);

    // T1 NAO deve ter o field visibility (foi revertido)
    const t1Reloaded = await tableRepo.findById(t1._id);
    const fieldIds = (t1Reloaded?.fields ?? []).map((f) =>
      typeof f === 'string' ? f : (f as any)._id,
    );
    const t1Fields = await fieldRepo.findMany({ _ids: fieldIds as string[] });
    expect(t1Fields.find((f) => f.slug === 'visibility')).toBeUndefined();

    // scope no extension NAO foi alterado
    const stored = await extensionRepo.findById(extensionId);
    expect(stored?.tableScope.tableIds ?? []).toHaveLength(0);
  });

  it('rejeita mode="all" para plugin com supportsScopeAll=false', async () => {
    const result = await useCase.execute({
      _id: extensionId,
      tableScope: { mode: 'all', tableIds: [] },
    });

    expect(result.isLeft()).toBe(true);
    expect((result.value as any).cause).toBe('SCOPE_ALL_NOT_SUPPORTED');
  });
});
