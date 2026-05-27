import { beforeEach, describe, expect, it } from 'vitest';

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

import TableRowPaginatedUseCase from './paginated.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let rowContextService: InMemoryRowContextService;
let sut: TableRowPaginatedUseCase;

describe('Table Row Paginated Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    rowContextService = new InMemoryRowContextService();

    sut = new TableRowPaginatedUseCase(
      tableInMemoryRepository,
      rowRepository,
      rowPasswordService,
      rowContextService,
      new RowAccessGuardService(new ExtensionInMemoryRepository()),
    );
  });

  it('deve retornar lista de rows paginada', async () => {
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

    await rowRepository.create({ table, data: { nome: 'Test 1' } });
    await rowRepository.create({ table, data: { nome: 'Test 2' } });

    const result = await sut.execute({
      slug: 'clientes',
      page: 1,
      perPage: 20,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.data).toHaveLength(2);
      expect(result.value.meta.total).toBe(2);
    }
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      page: 1,
      perPage: 20,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    }
  });

  it('deve retornar erro LIST_ROW_TABLE_PAGINATED_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      page: 1,
      perPage: 20,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('LIST_ROW_TABLE_PAGINATED_ERROR');
    }
  });
});

describe('Table Row Paginated Use Case — RowAccessGuard', () => {
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
    useCase: TableRowPaginatedUseCase;
    table: import('@application/core/entity.core').ITable;
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

    // Create extension record, enable it, and scope it to all tables
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

    // Create two rows: one PUBLIC, one SIGILOSO
    await rowRepo.create({ table, data: { visibility: E_VISIBILITY.PUBLIC } });
    await rowRepo.create({
      table,
      data: { visibility: E_VISIBILITY.SIGILOSO },
    });

    const guardService = new RowAccessGuardService(extensionRepo);
    const useCase = new TableRowPaginatedUseCase(
      tableRepo,
      rowRepo,
      passwordSvc,
      contextSvc,
      guardService,
    );

    return { useCase, table };
  }

  it('MANAGER + plugin ativo: filtra rows SIGILOSAS da listagem', async () => {
    const { useCase } = await setupWithPlugin();

    const result = await useCase.execute({
      slug: 'docs',
      page: 1,
      perPage: 20,
      userJwt: makeJwt(E_ROLE.MANAGER),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.meta.total).toBe(1);
      expect(result.value.data).toHaveLength(1);
      const row = result.value.data[0] as Record<string, unknown>;
      expect(row['visibility']).toBe(E_VISIBILITY.PUBLIC);
    }
  });

  it('MASTER + plugin ativo: ve todas as rows', async () => {
    const { useCase } = await setupWithPlugin();

    const result = await useCase.execute({
      slug: 'docs',
      page: 1,
      perPage: 20,
      userJwt: makeJwt(E_ROLE.MASTER),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.meta.total).toBe(2);
      expect(result.value.data).toHaveLength(2);
    }
  });

  it('sem plugin ativo: MANAGER ve todas as rows sem filtro', async () => {
    const tableRepo = new TableInMemoryRepository();
    const rowRepo = new RowInMemoryRepository();
    const passwordSvc = new InMemoryRowPasswordService();
    const contextSvc = new InMemoryRowContextService();
    const extensionRepo = new ExtensionInMemoryRepository();

    // no extension registered — guardService returns empty list
    const guardService = new RowAccessGuardService(extensionRepo);
    const useCase = new TableRowPaginatedUseCase(
      tableRepo,
      rowRepo,
      passwordSvc,
      contextSvc,
      guardService,
    );

    const table = await tableRepo.create(baseTablePayload);
    await rowRepo.create({ table, data: { visibility: E_VISIBILITY.PUBLIC } });
    await rowRepo.create({
      table,
      data: { visibility: E_VISIBILITY.SIGILOSO },
    });

    const result = await useCase.execute({
      slug: 'docs',
      page: 1,
      perPage: 20,
      userJwt: makeJwt(E_ROLE.MANAGER),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.meta.total).toBe(2);
    }
  });
});
