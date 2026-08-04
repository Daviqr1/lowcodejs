import { beforeEach, describe, expect, it } from 'vitest';

import { E_FIELD_TYPE, E_TABLE_STYLE } from '@application/core/entity.core';
import { makeField } from '@application/repositories/entity-fixtures';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import FieldValidationService from '@application/services/field-validation/field-validation.service';
import InMemoryFieldVisibilityService from '@application/services/field-visibility/in-memory-field-visibility.service';
import MongooseIdentifierService from '@application/services/identifier/identifier.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import InMemoryRowMemberNotificationService from '@application/services/row-member-notification/in-memory-row-member-notification.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import RowPayloadValidatorService from '@application/services/row-payload-validator/row-payload-validator.service';
import InMemoryScriptExecutionService from '@application/services/script-execution/in-memory-script-execution.service';
import SlugService from '@application/services/slug/slug.service';

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
      new InMemoryRowMemberNotificationService(),
      new InMemoryFieldVisibilityService(),
      new FieldValidationService(rowRepository, userRepository),
      new InMemoryRowAccessGuardService(),
      new SlugService(),
      new RowPayloadValidatorService(new MongooseIdentifierService()),
    );
  });

  it('deve criar row com sucesso', async () => {
    await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
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

  async function createTableWithUserField(
    fillWithCurrentUserWhenEmpty: boolean,
  ): Promise<void> {
    const userField = {
      ...makeField('responsavel'),
      type: E_FIELD_TYPE.USER,
      fillWithCurrentUserWhenEmpty,
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
  }

  it('deve gravar o usuario logado no campo USER com fillWithCurrentUserWhenEmpty quando nenhum id vem no payload', async () => {
    const creator = '507f1f77bcf86cd799439011';
    await createTableWithUserField(true);

    const result = await sut.execute({ slug: 'tarefas', creator });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.responsavel).toEqual([creator]);
    }
  });

  it('deve respeitar os ids enviados no campo USER com fillWithCurrentUserWhenEmpty', async () => {
    const creator = '507f1f77bcf86cd799439011';
    const enviado = '507f1f77bcf86cd799439022';
    await createTableWithUserField(true);

    const result = await sut.execute({
      slug: 'tarefas',
      creator,
      responsavel: [enviado],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.responsavel).toEqual([enviado]);
    }
  });

  it('nao deve preencher o campo USER quando fillWithCurrentUserWhenEmpty esta desligado', async () => {
    const creator = '507f1f77bcf86cd799439011';
    await createTableWithUserField(false);

    const result = await sut.execute({ slug: 'tarefas', creator });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.responsavel).toBeUndefined();
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
