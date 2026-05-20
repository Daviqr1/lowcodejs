import { beforeEach, describe, expect, it, vi } from 'vitest';
import TableSchemaInMemoryService from '@application/services/table-schema/table-schema-in-memory.service';

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

import {
  injectVisibilityByRoleGuardDeps,
  VisibilityByRoleGuard,
} from '../../../../extensions/core/plugins/visibility-by-role/guard';

import TableRowDeleteUseCase from './delete.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let sut: TableRowDeleteUseCase;

describe('Table Row Delete Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    sut = new TableRowDeleteUseCase(
      tableInMemoryRepository,
      rowRepository,
      new RowAccessGuardService(new ExtensionInMemoryRepository()),
    );
    vi.clearAllMocks();
  });

  it('deve deletar row com sucesso', async () => {
    const table = await tableInMemoryRepository.create({
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
    });

    const row = await rowRepository.create({
      table,
      data: { nome: 'Test' },
    });

    const result = await sut.execute({
      slug: 'clientes',
      _id: row._id,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toBeNull();
    }
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      _id: 'row-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    }
  });

  it('deve retornar erro DELETE_ROW_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      _id: 'row-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('DELETE_ROW_ERROR');
    }
  });
});

describe('TableRowDeleteUseCase with RowAccessGuard', () => {
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
    useCase: TableRowDeleteUseCase;
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
    const useCase = new TableRowDeleteUseCase(tableRepo, rowRepo, guardService);

    return { useCase, table, rowRepo };
  }

  it('MANAGER deletando row SIGILOSA: 403 ROW_ACCESS_DENIED', async () => {
    const { useCase, table, rowRepo } = await setupWithPlugin();

    const row = await rowRepo.create({
      table,
      data: { visibility: E_VISIBILITY.SIGILOSO },
    });

    const result = await useCase.execute({
      slug: 'docs',
      _id: row._id,
      userJwt: makeJwt(E_ROLE.MANAGER),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(403);
      expect(result.value.cause).toBe('ROW_ACCESS_DENIED');
    }
  });

  it('MASTER deletando row SIGILOSA: sucesso (right(null))', async () => {
    const { useCase, table, rowRepo } = await setupWithPlugin();

    const row = await rowRepo.create({
      table,
      data: { visibility: E_VISIBILITY.SIGILOSO },
    });

    const result = await useCase.execute({
      slug: 'docs',
      _id: row._id,
      userJwt: makeJwt(E_ROLE.MASTER),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toBeNull();
    }
  });

  it('MANAGER deletando row PUBLIC: sucesso', async () => {
    const { useCase, table, rowRepo } = await setupWithPlugin();

    const row = await rowRepo.create({
      table,
      data: { visibility: E_VISIBILITY.PUBLIC },
    });

    const result = await useCase.execute({
      slug: 'docs',
      _id: row._id,
      userJwt: makeJwt(E_ROLE.MANAGER),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toBeNull();
    }
  });
});
