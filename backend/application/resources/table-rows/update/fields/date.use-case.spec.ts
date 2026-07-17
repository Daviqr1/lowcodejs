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
import { makeDateField } from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import TableRowUpdateUseCase from '../update.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowUpdateUseCase;

describe('Table Row Update - DATE', () => {
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

  it('deve atualizar row com data ISO valida', async () => {
    const field = makeDateField({ slug: 'data' });
    const table = await makeTable(tableRepository, [field], {
      slug: 'eventos',
    });

    const row = await rowRepository.create({
      table,
      data: { data: '2024-01-15T10:00:00.000Z' },
    });

    const result = await sut.execute({
      slug: 'eventos',
      _id: row._id,
      data: '2024-06-20T14:30:00.000Z',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.data).toBe('2024-06-20T14:30:00.000Z');
  });

  it('deve rejeitar data invalida', async () => {
    const field = makeDateField({ slug: 'data' });
    const table = await makeTable(tableRepository, [field], {
      slug: 'eventos',
    });

    const row = await rowRepository.create({
      table,
      data: { data: '2024-01-15T10:00:00.000Z' },
    });

    const result = await sut.execute({
      slug: 'eventos',
      _id: row._id,
      data: 'data-invalida',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve pular validacao de campo omitido (skipMissing)', async () => {
    const field = makeDateField({ slug: 'data', required: true });
    const table = await makeTable(tableRepository, [field], {
      slug: 'eventos',
    });

    const row = await rowRepository.create({
      table,
      data: { data: '2024-01-15T10:00:00.000Z' },
    });

    const result = await sut.execute({
      slug: 'eventos',
      _id: row._id,
    });

    expect(result.isRight()).toBe(true);
  });
});
