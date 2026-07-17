import { beforeEach, describe, expect, it } from 'vitest';

import { E_FIELD_FORMAT } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import FieldValidationService from '@application/services/field-validation/field-validation.service';
import InMemoryFieldVisibilityService from '@application/services/field-visibility/in-memory-field-visibility.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import InMemoryRowMemberNotificationService from '@application/services/row-member-notification/in-memory-row-member-notification.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import InMemoryScriptExecutionService from '@application/services/script-execution/in-memory-script-execution.service';
import { makeTextLongField } from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import TableRowCreateUseCase from '../create.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let userRepository: UserInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowCreateUseCase;

describe('Table Row Create - TEXT_LONG', () => {
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

  it('deve criar row com texto longo valido', async () => {
    const field = makeTextLongField({ slug: 'descricao' });
    await makeTable(tableRepository, [field], { slug: 'artigos' });

    const result = await sut.execute({
      slug: 'artigos',
      descricao: '<p>Conteudo rico com <strong>HTML</strong></p>',
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.descricao).toBe(
      '<p>Conteudo rico com <strong>HTML</strong></p>',
    );
  });

  it('deve criar row com PLAIN_TEXT', async () => {
    const field = makeTextLongField({
      slug: 'observacoes',
      format: E_FIELD_FORMAT.PLAIN_TEXT,
    });
    await makeTable(tableRepository, [field], { slug: 'notas' });

    const result = await sut.execute({
      slug: 'notas',
      observacoes: 'Texto simples sem formatacao',
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
  });

  it('deve rejeitar quando required e valor ausente', async () => {
    const field = makeTextLongField({ slug: 'descricao', required: true });
    await makeTable(tableRepository, [field], { slug: 'artigos' });

    const result = await sut.execute({
      slug: 'artigos',
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    expect(result.value.errors).toHaveProperty('descricao');
  });

  it('deve rejeitar quando valor nao e string', async () => {
    const field = makeTextLongField({ slug: 'descricao' });
    await makeTable(tableRepository, [field], { slug: 'artigos' });

    const result = await sut.execute({
      slug: 'artigos',
      descricao: 12345,
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve aceitar valor vazio quando nao required', async () => {
    const field = makeTextLongField({ slug: 'descricao', required: false });
    await makeTable(tableRepository, [field], { slug: 'artigos' });

    const result = await sut.execute({
      slug: 'artigos',
      descricao: '',
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
  });
});
