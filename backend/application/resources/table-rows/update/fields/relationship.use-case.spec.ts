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
import { makeRelationshipField } from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import TableRowUpdateUseCase from '../update.use-case';

const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
const VALID_OBJECT_ID_2 = '507f1f77bcf86cd799439022';

const RELATIONSHIP_CONFIG = {
  table: { _id: '507f1f77bcf86cd799439099', slug: 'produtos' },
  field: { _id: '507f1f77bcf86cd799439088', slug: 'nome' },
  order: 'asc' as const,
};

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowUpdateUseCase;

describe('Table Row Update - RELATIONSHIP', () => {
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
    const field = makeRelationshipField(RELATIONSHIP_CONFIG, {
      slug: 'produtos',
    });
    const table = await makeTable(tableRepository, [field], {
      slug: 'pedidos',
    });

    const row = await rowRepository.create({
      table,
      data: { produtos: [VALID_OBJECT_ID] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      _id: row._id,
      produtos: [VALID_OBJECT_ID_2],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.produtos).toEqual([VALID_OBJECT_ID_2]);
  });

  // RELATIONSHIP não é mais validado no payload do row (gerido via links).
  it('deve pular validacao de campo omitido (skipMissing)', async () => {
    const field = makeRelationshipField(RELATIONSHIP_CONFIG, {
      slug: 'produtos',
      required: true,
    });
    const table = await makeTable(tableRepository, [field], {
      slug: 'pedidos',
    });

    const row = await rowRepository.create({
      table,
      data: { produtos: [VALID_OBJECT_ID] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      _id: row._id,
    });

    expect(result.isRight()).toBe(true);
  });
});
