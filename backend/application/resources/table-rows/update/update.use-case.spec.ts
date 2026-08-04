import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_FIELD_TYPE, E_TABLE_STYLE } from '@application/core/entity.core';
import { EntityFixtures } from '@application/repositories/entity-fixtures';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import FieldValidationService from '@application/services/field-validation/field-validation.service';
import FieldValidationRuleRegistryService from '@application/services/field-validation/rule-registry.service';
import InMemoryFieldVisibilityService from '@application/services/field-visibility/in-memory-field-visibility.service';
import MongooseIdentifierService from '@application/services/identifier/identifier.service';
import InMemoryKanbanCommentMentionService from '@application/services/kanban-comment-mention/in-memory-kanban-comment-mention.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import InMemoryRowMemberNotificationService from '@application/services/row-member-notification/in-memory-row-member-notification.service';
import RowOwnershipService from '@application/services/row-ownership/row-ownership.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import RowPayloadValidatorService from '@application/services/row-payload-validator/row-payload-validator.service';
import InMemoryScriptExecutionService from '@application/services/script-execution/in-memory-script-execution.service';
import SlugService from '@application/services/slug/slug.service';

import TableRowUpdateUseCase from './update.use-case';

const fixtures = new EntityFixtures();

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
      new UserInMemoryRepository(),
      rowPasswordService,
      scriptExecutionService,
      kanbanCommentMentionService,
      new InMemoryRowMemberNotificationService(),
      new InMemoryFieldVisibilityService(),
      new FieldValidationService(
        rowRepository,
        new UserInMemoryRepository(),
        new FieldValidationRuleRegistryService(),
      ),
      new InMemoryRowAccessGuardService(),
      new SlugService(),
      new RowOwnershipService(),
      new RowPayloadValidatorService(new MongooseIdentifierService()),
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
      style: E_TABLE_STYLE.LIST,
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

  it('deve preencher updater (auditoria nativa) com o usuario da alteracao', async () => {
    const table = await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const row = await rowRepository.create({
      table,
      data: { nome: 'Original Name', updater: null },
    });

    const result = await sut.execute({
      slug: 'clientes',
      _id: row._id,
      nome: 'Updated Name',
      __actorUserId: 'user-123',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toMatchObject({ updater: 'user-123' });
    }
  });

  async function createTableWithUserField(): Promise<
    import('@application/core/entity.core').ITable
  > {
    const userField = {
      ...fixtures.makeField('responsavel'),
      type: E_FIELD_TYPE.USER,
      fillWithCurrentUserWhenEmpty: true,
    };

    const table = await tableInMemoryRepository.create({
      name: 'Tarefas',
      slug: 'tarefas',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    table.fields = [userField];
    return table;
  }

  it('deve gravar o usuario logado no campo USER com fillWithCurrentUserWhenEmpty quando nenhum id vem no payload', async () => {
    const actor = '507f1f77bcf86cd799439011';
    const table = await createTableWithUserField();

    const row = await rowRepository.create({
      table,
      data: { responsavel: ['507f1f77bcf86cd799439099'] },
    });

    const result = await sut.execute({
      slug: 'tarefas',
      _id: row._id,
      responsavel: [],
      __actorUserId: actor,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.responsavel).toEqual([actor]);
    }
  });

  it('deve respeitar os ids enviados no campo USER com fillWithCurrentUserWhenEmpty', async () => {
    const actor = '507f1f77bcf86cd799439011';
    const enviado = '507f1f77bcf86cd799439022';
    const table = await createTableWithUserField();

    const row = await rowRepository.create({ table, data: {} });

    const result = await sut.execute({
      slug: 'tarefas',
      _id: row._id,
      responsavel: [enviado],
      __actorUserId: actor,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.responsavel).toEqual([enviado]);
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
