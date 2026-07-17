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
import { makeFileField } from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import TableRowCreateUseCase from '../create.use-case';

const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
const VALID_OBJECT_ID_2 = '507f1f77bcf86cd799439022';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let userRepository: UserInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowCreateUseCase;

describe('Table Row Create - FILE', () => {
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
    const field = makeFileField({ slug: 'anexos' });
    await makeTable(tableRepository, [field], { slug: 'documentos' });

    const result = await sut.execute({
      slug: 'documentos',
      anexos: [VALID_OBJECT_ID],
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.anexos).toEqual([VALID_OBJECT_ID]);
  });

  it('deve criar row com multiplos arquivos', async () => {
    const field = makeFileField({ slug: 'anexos', multiple: true });
    await makeTable(tableRepository, [field], { slug: 'documentos' });

    const result = await sut.execute({
      slug: 'documentos',
      anexos: [VALID_OBJECT_ID, VALID_OBJECT_ID_2],
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.anexos).toHaveLength(2);
  });

  it('deve rejeitar quando valor nao e array', async () => {
    const field = makeFileField({ slug: 'anexos' });
    await makeTable(tableRepository, [field], { slug: 'documentos' });

    const result = await sut.execute({
      slug: 'documentos',
      anexos: VALID_OBJECT_ID,
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve rejeitar quando itens nao sao ObjectIds validos', async () => {
    const field = makeFileField({ slug: 'anexos' });
    await makeTable(tableRepository, [field], { slug: 'documentos' });

    const result = await sut.execute({
      slug: 'documentos',
      anexos: ['invalid-id'],
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('deve rejeitar quando required e valor ausente', async () => {
    const field = makeFileField({ slug: 'anexos', required: true });
    await makeTable(tableRepository, [field], { slug: 'documentos' });

    const result = await sut.execute({
      slug: 'documentos',
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve aceitar array vazio quando nao required', async () => {
    const field = makeFileField({ slug: 'anexos', required: false });
    await makeTable(tableRepository, [field], { slug: 'documentos' });

    const result = await sut.execute({
      slug: 'documentos',
      anexos: [],
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
  });
});
