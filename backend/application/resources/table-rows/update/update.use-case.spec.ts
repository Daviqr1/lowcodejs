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
import InMemoryKanbanCommentMentionService from '@application/services/kanban-comment-mention/in-memory-kanban-comment-mention.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import InMemoryScriptExecutionService from '@application/services/script-execution/in-memory-script-execution.service';

import {
  injectVisibilityByRoleGuardDeps,
  VisibilityByRoleGuard,
} from '../../../../extensions/core/plugins/visibility-by-role/guard';

import TableRowUpdateUseCase from './update.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let kanbanCommentMentionService: InMemoryKanbanCommentMentionService;
let sut: TableRowUpdateUseCase;

describe('Table Row Update Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    scriptExecutionService = new InMemoryScriptExecutionService();
    kanbanCommentMentionService = new InMemoryKanbanCommentMentionService();

    sut = new TableRowUpdateUseCase(
      tableInMemoryRepository,
      rowRepository,
      rowPasswordService,
      scriptExecutionService,
      kanbanCommentMentionService,
      new RowAccessGuardService(new ExtensionInMemoryRepository()),
    );
    vi.clearAllMocks();
  });

  it('deve atualizar row com sucesso', async () => {
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
      data: { nome: 'Original Name' },
    });

    const result = await sut.execute({
      slug: 'clientes',
      _id: row._id,
      nome: 'Updated Name',
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

  it('deve retornar erro UPDATE_ROW_TABLE_ERROR quando houver falha', async () => {
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
      expect(result.value.cause).toBe('UPDATE_ROW_TABLE_ERROR');
    }
  });
});

describe('TableRowUpdateUseCase with RowAccessGuard', () => {
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
    useCase: TableRowUpdateUseCase;
    table: import('@application/core/entity.core').ITable;
    rowRepo: RowInMemoryRepository;
  }> {
    const tableRepo = new TableInMemoryRepository();
    const rowRepo = new RowInMemoryRepository();
    const passwordSvc = new InMemoryRowPasswordService();
    const scriptSvc = new InMemoryScriptExecutionService();
    const mentionSvc = new InMemoryKanbanCommentMentionService();
    const extensionRepo = new ExtensionInMemoryRepository();

    injectVisibilityByRoleGuardDeps({
      fieldRepo: {} as any,
      tableRepo,
      rowRepo,
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
    const useCase = new TableRowUpdateUseCase(
      tableRepo,
      rowRepo,
      passwordSvc,
      scriptSvc,
      mentionSvc,
      guardService,
    );

    return { useCase, table, rowRepo };
  }

  it('MANAGER setando visibility=SIGILOSO em row PUBLIC: 403 ROW_WRITE_RESTRICTED', async () => {
    const { useCase, table, rowRepo } = await setupWithPlugin();

    const row = await rowRepo.create({
      table,
      data: { visibility: E_VISIBILITY.PUBLIC },
    });

    const result = await useCase.execute({
      slug: 'docs',
      _id: row._id,
      visibility: E_VISIBILITY.SIGILOSO,
      __actorUserJwt: makeJwt(E_ROLE.MANAGER),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(403);
      expect(result.value.cause).toBe('ROW_WRITE_RESTRICTED');
    }
  });

  it('MANAGER editando row PUBLIC sem mexer em visibility: sucesso (visibility preservado)', async () => {
    const { useCase, table, rowRepo } = await setupWithPlugin();

    const row = await rowRepo.create({
      table,
      data: { visibility: E_VISIBILITY.PUBLIC, nome: 'Original' },
    });

    const result = await useCase.execute({
      slug: 'docs',
      _id: row._id,
      nome: 'Updated',
      __actorUserJwt: makeJwt(E_ROLE.MANAGER),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value._id).toBeDefined();
      // sanitize preserves PUBLIC visibility since MANAGER cannot change it
      expect((result.value as Record<string, unknown>)['visibility']).toBe(
        E_VISIBILITY.PUBLIC,
      );
    }
  });

  it('MANAGER editando row SIGILOSA: 403 ROW_ACCESS_DENIED', async () => {
    const { useCase, table, rowRepo } = await setupWithPlugin();

    const row = await rowRepo.create({
      table,
      data: { visibility: E_VISIBILITY.SIGILOSO },
    });

    const result = await useCase.execute({
      slug: 'docs',
      _id: row._id,
      nome: 'Tentativa',
      __actorUserJwt: makeJwt(E_ROLE.MANAGER),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(403);
      expect(result.value.cause).toBe('ROW_ACCESS_DENIED');
    }
  });

  it('MASTER setando visibility=SIGILOSO em row PUBLIC: sucesso', async () => {
    const { useCase, table, rowRepo } = await setupWithPlugin();

    const row = await rowRepo.create({
      table,
      data: { visibility: E_VISIBILITY.PUBLIC },
    });

    const result = await useCase.execute({
      slug: 'docs',
      _id: row._id,
      visibility: E_VISIBILITY.SIGILOSO,
      __actorUserJwt: makeJwt(E_ROLE.MASTER),
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
