import { beforeEach, describe, expect, it } from 'vitest';

import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import FieldValidationService from '@application/services/field-validation/field-validation.service';
import InMemoryFieldVisibilityService from '@application/services/field-visibility/in-memory-field-visibility.service';
import InMemoryKanbanCommentMentionService from '@application/services/kanban-comment-mention/in-memory-kanban-comment-mention.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import InMemoryRowMemberNotificationService from '@application/services/row-member-notification/in-memory-row-member-notification.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import InMemoryScriptExecutionService from '@application/services/script-execution/in-memory-script-execution.service';
import { makeUserField } from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import TableRowUpdateUseCase from '../update.use-case';

const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
const VALID_OBJECT_ID_2 = '507f1f77bcf86cd799439022';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowUpdateUseCase;

describe('Table Row Update - USER', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    scriptExecutionService = new InMemoryScriptExecutionService();

    sut = new TableRowUpdateUseCase(
      tableRepository,
      rowRepository,
      new UserInMemoryRepository(),
      rowPasswordService,
      scriptExecutionService,
      new InMemoryKanbanCommentMentionService(),
      new InMemoryRowMemberNotificationService(),
      new InMemoryFieldVisibilityService(),
      new FieldValidationService(rowRepository, new UserInMemoryRepository()),
      new InMemoryRowAccessGuardService(),
    );
  });

  it('deve atualizar row com array de ObjectIds validos', async () => {
    const field = makeUserField({ slug: 'responsavel' });
    const table = await makeTable(tableRepository, [field], {
      slug: 'tarefas',
    });

    const row = await rowRepository.create({
      table,
      data: { responsavel: [VALID_OBJECT_ID] },
    });

    const result = await sut.execute({
      slug: 'tarefas',
      _id: row._id,
      responsavel: [VALID_OBJECT_ID_2],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.responsavel).toEqual([VALID_OBJECT_ID_2]);
  });

  it('deve rejeitar quando itens nao sao ObjectIds validos', async () => {
    const field = makeUserField({ slug: 'responsavel' });
    const table = await makeTable(tableRepository, [field], {
      slug: 'tarefas',
    });

    const row = await rowRepository.create({
      table,
      data: { responsavel: [VALID_OBJECT_ID] },
    });

    const result = await sut.execute({
      slug: 'tarefas',
      _id: row._id,
      responsavel: ['not-a-valid-id', 'also-invalid'],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve pular validacao de campo omitido (skipMissing)', async () => {
    const field = makeUserField({ slug: 'responsavel', required: true });
    const table = await makeTable(tableRepository, [field], {
      slug: 'tarefas',
    });

    const row = await rowRepository.create({
      table,
      data: { responsavel: [VALID_OBJECT_ID] },
    });

    const result = await sut.execute({
      slug: 'tarefas',
      _id: row._id,
    });

    expect(result.isRight()).toBe(true);
  });
});
