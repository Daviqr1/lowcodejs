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
import InMemoryRowContextService from '@application/services/row-context/in-memory-row-context.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import TableSchemaInMemoryService from '@application/services/table-schema/table-schema-in-memory.service';

import {
  injectRowAccessGuardDeps,
  RowAccessControlGuard,
} from '../../../../extensions/core/plugins/row-access/guard';

import TableRowShowUseCase from './show.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let rowContextService: InMemoryRowContextService;
let sut: TableRowShowUseCase;

describe('Table Row Show Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    rowContextService = new InMemoryRowContextService();

    sut = new TableRowShowUseCase(
      tableInMemoryRepository,
      rowRepository,
      rowPasswordService,
      rowContextService,
      new RowAccessGuardService(new ExtensionInMemoryRepository()),
    );
    vi.clearAllMocks();
  });

  it('deve retornar row existente', async () => {
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
      expect(result.value._id).toBeDefined();
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

  it('deve retornar erro GET_ROW_TABLE_BY_ID_ERROR quando houver falha', async () => {
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
      expect(result.value.cause).toBe('GET_ROW_TABLE_BY_ID_ERROR');
    }
  });
});

describe('Table Row Show Use Case — RowAccessGuard', () => {
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
    useCase: TableRowShowUseCase;
    table: import('@application/core/entity.core').ITable;
    rowRepo: RowInMemoryRepository;
  }> {
    const tableRepo = new TableInMemoryRepository();
    const rowRepo = new RowInMemoryRepository();
    const passwordSvc = new InMemoryRowPasswordService();
    const contextSvc = new InMemoryRowContextService();
    const extensionRepo = new ExtensionInMemoryRepository();

    injectRowAccessGuardDeps({
      fieldRepo: {} as any,
      tableRepo,
      rowRepo,
      tableSchemaService: new TableSchemaInMemoryService(),
    });

    RowAccessGuardService.register(
      RowAccessControlGuard.pluginKey,
      RowAccessControlGuard,
    );

    const ext = await extensionRepo.upsert({
      pkg: 'core',
      type: E_EXTENSION_TYPE.PLUGIN,
      extensionId: 'row-access',
      name: 'Controle de Acesso a Linhas',
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
    const useCase = new TableRowShowUseCase(
      tableRepo,
      rowRepo,
      passwordSvc,
      contextSvc,
      guardService,
    );

    return { useCase, table, rowRepo };
  }

  it('MANAGER acessando row SIGILOSA: 403 ROW_ACCESS_DENIED', async () => {
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

  it('MANAGER acessando row PUBLIC: sucesso', async () => {
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
      expect(result.value._id).toBeDefined();
      expect((result.value as Record<string, unknown>)['visibility']).toBe(
        E_VISIBILITY.PUBLIC,
      );
    }
  });

  it('MASTER acessando row SIGILOSA: sucesso', async () => {
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
      expect(result.value._id).toBeDefined();
      expect((result.value as Record<string, unknown>)['visibility']).toBe(
        E_VISIBILITY.SIGILOSO,
      );
    }
  });
});
