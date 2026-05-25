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
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import InMemoryScriptExecutionService from '@application/services/script-execution/in-memory-script-execution.service';
import TableSchemaInMemoryService from '@application/services/table-schema/table-schema-in-memory.service';

import {
  injectVisibilityByRoleGuardDeps,
  VisibilityByRoleGuard,
} from '../../../../extensions/core/plugins/visibility-by-role/guard';

import TableRowCreateUseCase from './create.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let userRepository: UserInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowCreateUseCase;

describe('Table Row Create Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    userRepository = new UserInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    scriptExecutionService = new InMemoryScriptExecutionService();

    sut = new TableRowCreateUseCase(
      tableInMemoryRepository,
      rowRepository,
      userRepository,
      rowPasswordService,
      scriptExecutionService,
      new RowAccessGuardService(new ExtensionInMemoryRepository()),
    );
  });

  it('deve criar row com sucesso', async () => {
    await tableInMemoryRepository.create({
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

    const result = await sut.execute({
      slug: 'clientes',
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value._id).toBeDefined();
    }
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    }
  });

  it('deve retornar erro CREATE_ROW_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('CREATE_ROW_ERROR');
    }
  });
});

describe('TableRowCreateUseCase with RowAccessGuard', () => {
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
    useCase: TableRowCreateUseCase;
    table: import('@application/core/entity.core').ITable;
  }> {
    const tableRepo = new TableInMemoryRepository();
    const rowRepo = new RowInMemoryRepository();
    const userRepo = new UserInMemoryRepository();
    const passwordSvc = new InMemoryRowPasswordService();
    const scriptSvc = new InMemoryScriptExecutionService();
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
    const useCase = new TableRowCreateUseCase(
      tableRepo,
      rowRepo,
      userRepo,
      passwordSvc,
      scriptSvc,
      guardService,
    );

    return { useCase, table };
  }

  it('MANAGER criando com visibility=SIGILOSO: 403 ROW_WRITE_RESTRICTED', async () => {
    const { useCase } = await setupWithPlugin();

    const result = await useCase.execute({
      slug: 'docs',
      visibility: E_VISIBILITY.SIGILOSO,
      __actorUserJwt: makeJwt(E_ROLE.MANAGER),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(403);
      expect(result.value.cause).toBe('ROW_WRITE_RESTRICTED');
    }
  });

  it('MANAGER criando sem visibility no payload: visibility=PUBLIC sanitizado', async () => {
    const { useCase } = await setupWithPlugin();

    const result = await useCase.execute({
      slug: 'docs',
      nome: 'Teste',
      __actorUserJwt: makeJwt(E_ROLE.MANAGER),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value._id).toBeDefined();
      expect((result.value as Record<string, unknown>)['visibility']).toEqual([
        E_VISIBILITY.PUBLIC,
      ]);
    }
  });

  it('MANAGER criando com visibility=PUBLIC: criado como PUBLIC', async () => {
    const { useCase } = await setupWithPlugin();

    const result = await useCase.execute({
      slug: 'docs',
      visibility: E_VISIBILITY.PUBLIC,
      __actorUserJwt: makeJwt(E_ROLE.MANAGER),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value._id).toBeDefined();
      expect((result.value as Record<string, unknown>)['visibility']).toEqual([
        E_VISIBILITY.PUBLIC,
      ]);
    }
  });

  it('MASTER criando com visibility=SIGILOSO: criado como SIGILOSO (preservado)', async () => {
    const { useCase } = await setupWithPlugin();

    const result = await useCase.execute({
      slug: 'docs',
      visibility: E_VISIBILITY.SIGILOSO,
      __actorUserJwt: makeJwt(E_ROLE.MASTER),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value._id).toBeDefined();
      expect((result.value as Record<string, unknown>)['visibility']).toBe(
        E_VISIBILITY.SIGILOSO, // MASTER preserva o valor exato passado (string crua)
      );
    }
  });
});
