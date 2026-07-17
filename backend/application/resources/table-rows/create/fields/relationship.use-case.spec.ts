import { beforeEach, describe, expect, it } from 'vitest';

import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import FieldValidationService from '@application/services/field-validation/field-validation.service';
import InMemoryFieldVisibilityService from '@application/services/field-visibility/in-memory-field-visibility.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import InMemoryRowMemberNotificationService from '@application/services/row-member-notification/in-memory-row-member-notification.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import InMemoryScriptExecutionService from '@application/services/script-execution/in-memory-script-execution.service';
import { makeRelationshipField } from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import TableRowCreateUseCase from '../create.use-case';

const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
const VALID_OBJECT_ID_2 = '507f1f77bcf86cd799439022';

const RELATIONSHIP_CONFIG = {
  table: { _id: '507f1f77bcf86cd799439099', slug: 'produtos' },
  field: { _id: '507f1f77bcf86cd799439088', slug: 'nome' },
  order: 'asc' as const,
};

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let userRepository: UserInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowCreateUseCase;

describe('Table Row Create - RELATIONSHIP', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    userRepository = new UserInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    scriptExecutionService = new InMemoryScriptExecutionService();

    sut = new TableRowCreateUseCase(
      tableRepository,
      rowRepository,
      userRepository,
      rowPasswordService,
      scriptExecutionService,
      new InMemoryRowMemberNotificationService(),
      new InMemoryFieldVisibilityService(),
      new FieldValidationService(rowRepository, userRepository),
      new InMemoryRowAccessGuardService(),
    );
  });

  it('deve criar row com array de ObjectIds validos', async () => {
    const field = makeRelationshipField(RELATIONSHIP_CONFIG, {
      slug: 'produtos',
    });
    await makeTable(tableRepository, [field], { slug: 'pedidos' });

    const result = await sut.execute({
      slug: 'pedidos',
      produtos: [VALID_OBJECT_ID],
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.produtos).toEqual([VALID_OBJECT_ID]);
  });

  it('deve criar row com multiplos ObjectIds', async () => {
    const field = makeRelationshipField(RELATIONSHIP_CONFIG, {
      slug: 'produtos',
      multiple: true,
    });
    await makeTable(tableRepository, [field], { slug: 'pedidos' });

    const result = await sut.execute({
      slug: 'pedidos',
      produtos: [VALID_OBJECT_ID, VALID_OBJECT_ID_2],
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.produtos).toHaveLength(2);
  });

  // RELATIONSHIP não é mais validado no payload do row: os vínculos são geridos
  // via links (extract/persist) e o required é barrado no frontend. O validador
  // ignora o campo, então valores ausentes/atípicos não rejeitam a criação.
  it('deve aceitar quando required e valor ausente (gerido via links)', async () => {
    const field = makeRelationshipField(RELATIONSHIP_CONFIG, {
      slug: 'produtos',
      required: true,
    });
    await makeTable(tableRepository, [field], { slug: 'pedidos' });

    const result = await sut.execute({
      slug: 'pedidos',
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
  });

  it('deve aceitar array vazio quando nao required', async () => {
    const field = makeRelationshipField(RELATIONSHIP_CONFIG, {
      slug: 'produtos',
      required: false,
    });
    await makeTable(tableRepository, [field], { slug: 'pedidos' });

    const result = await sut.execute({
      slug: 'pedidos',
      produtos: [],
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
  });
});
