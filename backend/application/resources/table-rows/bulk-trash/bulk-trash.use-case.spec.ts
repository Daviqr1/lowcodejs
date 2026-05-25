import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  E_EXTENSION_TYPE,
  E_JWT_TYPE,
  E_ROLE,
  E_TABLE_COLLABORATION,
  E_TABLE_STYLE,
  E_TABLE_VISIBILITY,
  E_VISIBILITY,
} from '@application/core/entity.core';
import type { IJWTPayload } from '@application/core/entity.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import ExtensionInMemoryRepository from '@application/repositories/extension/extension-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import TableSchemaInMemoryService from '@application/services/table-schema/table-schema-in-memory.service';

import {
  injectVisibilityByRoleGuardDeps,
  VisibilityByRoleGuard,
} from '../../../../extensions/core/plugins/visibility-by-role/guard';

import BulkTrashUseCase from './bulk-trash.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let sut: BulkTrashUseCase;

const TABLE_PAYLOAD = {
  name: 'Clientes',
  slug: 'clientes',
  _schema: {},
  fields: [],
  owner: 'owner-id',
  administrators: [],
  style: E_TABLE_STYLE.LIST,
  visibility: E_TABLE_VISIBILITY.RESTRICTED,
  collaboration: E_TABLE_COLLABORATION.RESTRICTED,
  fieldOrderList: [],
  fieldOrderForm: [],
};

describe('Bulk Trash Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowInMemoryRepository = new RowInMemoryRepository();
    sut = new BulkTrashUseCase(
      tableInMemoryRepository,
      rowInMemoryRepository,
      new RowAccessGuardService(new ExtensionInMemoryRepository()),
    );
    vi.clearAllMocks();
  });

  it('deve enviar multiplos registros para lixeira com sucesso', async () => {
    const table = await tableInMemoryRepository.create(TABLE_PAYLOAD);

    const row1 = await rowInMemoryRepository.create({
      table,
      data: { nome: 'Cliente 1' },
    });
    const row2 = await rowInMemoryRepository.create({
      table,
      data: { nome: 'Cliente 2' },
    });
    const row3 = await rowInMemoryRepository.create({
      table,
      data: { nome: 'Cliente 3' },
    });

    const result = await sut.execute({
      slug: 'clientes',
      ids: [row1._id, row2._id, row3._id],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.deleted).toBe(3);
    expect(result.value.skipped).toHaveLength(0);

    const trashed1 = await rowInMemoryRepository.findOne({
      table,
      query: { _id: row1._id },
    });
    const trashed2 = await rowInMemoryRepository.findOne({
      table,
      query: { _id: row2._id },
    });
    const trashed3 = await rowInMemoryRepository.findOne({
      table,
      query: { _id: row3._id },
    });
    expect(trashed1?.trashed).toBe(true);
    expect(trashed2?.trashed).toBe(true);
    expect(trashed3?.trashed).toBe(true);
  });

  it('deve retornar TABLE_NOT_FOUND quando tabela nao existe', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      ids: ['id-1', 'id-2'],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
  });

  it('deve retornar deleted: 0 e skipped quando nenhum registro encontrado', async () => {
    await tableInMemoryRepository.create(TABLE_PAYLOAD);

    const result = await sut.execute({
      slug: 'clientes',
      ids: ['non-existent-id-1', 'non-existent-id-2'],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.deleted).toBe(0);
    expect(result.value.skipped).toHaveLength(2);
    expect(result.value.skipped[0].reason).toBe('NOT_FOUND');
  });

  it('deve retornar BULK_TRASH_ROW_ERROR quando repository falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'clientes',
      ids: ['id-1'],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('BULK_TRASH_ROWS_ERROR');
  });
});

describe('Bulk Trash Use Case — RowAccessGuard', () => {
  const baseTablePayload = {
    name: 'Docs',
    slug: 'docs',
    _schema: {},
    fields: [],
    owner: 'owner-id',
    administrators: [],
    style: E_TABLE_STYLE.LIST,
    visibility: E_TABLE_VISIBILITY.RESTRICTED,
    collaboration: E_TABLE_COLLABORATION.RESTRICTED,
    fieldOrderList: [],
    fieldOrderForm: [],
  };

  function makeJwt(role: string): IJWTPayload {
    return {
      sub: 'u1',
      email: 'u@x.com',
      role: role as IJWTPayload['role'],
      type: E_JWT_TYPE.ACCESS,
    };
  }

  async function setupWithPlugin(): Promise<{
    useCase: BulkTrashUseCase;
    table: import('@application/core/entity.core').ITable;
    rowRepo: RowInMemoryRepository;
  }> {
    const tableRepo = new TableInMemoryRepository();
    const rowRepo = new RowInMemoryRepository();
    const extensionRepo = new ExtensionInMemoryRepository();

    injectVisibilityByRoleGuardDeps({
      fieldRepo: {} as any,
      tableRepo,
      rowRepo,
      tableSchemaService: new TableSchemaInMemoryService(),
    });

    RowAccessGuardService.register(
      VisibilityByRoleGuard.pluginKey,
      VisibilityByRoleGuard,
    );

    const ext = await extensionRepo.upsert({
      pkg: 'core',
      type: E_EXTENSION_TYPE.PLUGIN,
      extensionId: 'visibility-by-role',
      name: 'Visibility by Role',
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

    const table = await tableRepo.create(baseTablePayload);
    await extensionRepo.toggleEnabled({ _id: ext._id, enabled: true });
    await extensionRepo.updateTableScope({
      _id: ext._id,
      tableScope: { mode: 'specific', tableIds: [table._id] },
    });

    const guardService = new RowAccessGuardService(extensionRepo);
    const useCase = new BulkTrashUseCase(tableRepo, rowRepo, guardService);

    return { useCase, table, rowRepo };
  }

  it('MANAGER: rows SIGILOSAS são skipped, PUBLIC são deletadas', async () => {
    const { useCase, table, rowRepo } = await setupWithPlugin();

    const publicRow = await rowRepo.create({
      table,
      data: { visibility: E_VISIBILITY.PUBLIC },
    });
    const sigilosoRow = await rowRepo.create({
      table,
      data: { visibility: E_VISIBILITY.SIGILOSO },
    });

    const result = await useCase.execute({
      slug: 'docs',
      ids: [publicRow._id, sigilosoRow._id],
      userJwt: makeJwt(E_ROLE.MANAGER),
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.deleted).toBe(1);
    expect(result.value.skipped).toHaveLength(1);
    expect(result.value.skipped[0].rowId).toBe(sigilosoRow._id);
    expect(result.value.skipped[0].reason).toBe('ROW_ACCESS_DENIED');
  });

  it('MASTER: todas as rows são deletadas (admin bypass)', async () => {
    const { useCase, table, rowRepo } = await setupWithPlugin();

    const publicRow = await rowRepo.create({
      table,
      data: { visibility: E_VISIBILITY.PUBLIC },
    });
    const sigilosoRow = await rowRepo.create({
      table,
      data: { visibility: E_VISIBILITY.SIGILOSO },
    });

    const result = await useCase.execute({
      slug: 'docs',
      ids: [publicRow._id, sigilosoRow._id],
      userJwt: makeJwt(E_ROLE.MASTER),
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.deleted).toBe(2);
    expect(result.value.skipped).toHaveLength(0);
  });
});
