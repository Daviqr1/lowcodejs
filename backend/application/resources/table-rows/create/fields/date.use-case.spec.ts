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
import { makeDateField } from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import TableRowCreateUseCase from '../create.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let userRepository: UserInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowCreateUseCase;

describe('Table Row Create - DATE', () => {
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

  it('deve criar row com data ISO valida', async () => {
    const field = makeDateField({ slug: 'nascimento' });
    await makeTable(tableRepository, [field], { slug: 'pessoas' });

    const result = await sut.execute({
      slug: 'pessoas',
      nascimento: '2024-01-15T10:30:00.000Z',
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.nascimento).toBe('2024-01-15T10:30:00.000Z');
  });

  it('deve aceitar data sem horario', async () => {
    const field = makeDateField({ slug: 'nascimento' });
    await makeTable(tableRepository, [field], { slug: 'pessoas' });

    const result = await sut.execute({
      slug: 'pessoas',
      nascimento: '2024-01-15',
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
  });

  it('deve rejeitar data invalida', async () => {
    const field = makeDateField({ slug: 'nascimento' });
    await makeTable(tableRepository, [field], { slug: 'pessoas' });

    const result = await sut.execute({
      slug: 'pessoas',
      nascimento: 'not-a-date',
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve rejeitar quando required e valor ausente', async () => {
    const field = makeDateField({ slug: 'nascimento', required: true });
    await makeTable(tableRepository, [field], { slug: 'pessoas' });

    const result = await sut.execute({
      slug: 'pessoas',
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    expect(result.value.errors).toHaveProperty('nascimento');
  });

  it('deve aceitar valor vazio quando nao required', async () => {
    const field = makeDateField({ slug: 'nascimento', required: false });
    await makeTable(tableRepository, [field], { slug: 'pessoas' });

    const result = await sut.execute({
      slug: 'pessoas',
      nascimento: '',
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
  });

  it('deve rejeitar quando valor nao e string', async () => {
    const field = makeDateField({ slug: 'nascimento' });
    await makeTable(tableRepository, [field], { slug: 'pessoas' });

    const result = await sut.execute({
      slug: 'pessoas',
      nascimento: 1705312200000,
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
  });
});
