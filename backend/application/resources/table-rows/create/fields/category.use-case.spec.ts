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
import { makeCategoryField } from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import TableRowCreateUseCase from '../create.use-case';

const CATEGORIES = [
  { id: '1', label: 'Tecnologia', children: [] },
  {
    id: '2',
    label: 'Saude',
    children: [{ id: '2.1', label: 'Medicina', children: [] }],
  },
];

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let userRepository: UserInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowCreateUseCase;

describe('Table Row Create - CATEGORY', () => {
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

  it('deve criar row com array de strings valido', async () => {
    const field = makeCategoryField(CATEGORIES, { slug: 'categorias' });
    await makeTable(tableRepository, [field], { slug: 'artigos' });

    const result = await sut.execute({
      slug: 'artigos',
      categorias: ['1', '2.1'],
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.categorias).toEqual(['1', '2.1']);
  });

  it('deve rejeitar quando valor nao e array', async () => {
    const field = makeCategoryField(CATEGORIES, { slug: 'categorias' });
    await makeTable(tableRepository, [field], { slug: 'artigos' });

    const result = await sut.execute({
      slug: 'artigos',
      categorias: 'Tecnologia',
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve rejeitar quando itens nao sao strings', async () => {
    const field = makeCategoryField(CATEGORIES, { slug: 'categorias' });
    await makeTable(tableRepository, [field], { slug: 'artigos' });

    const result = await sut.execute({
      slug: 'artigos',
      categorias: [123, 456],
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('deve rejeitar quando required e valor ausente', async () => {
    const field = makeCategoryField(CATEGORIES, {
      slug: 'categorias',
      required: true,
    });
    await makeTable(tableRepository, [field], { slug: 'artigos' });

    const result = await sut.execute({
      slug: 'artigos',
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.errors).toHaveProperty('categorias');
  });

  it('deve aceitar array vazio quando nao required', async () => {
    const field = makeCategoryField(CATEGORIES, {
      slug: 'categorias',
      required: false,
    });
    await makeTable(tableRepository, [field], { slug: 'artigos' });

    const result = await sut.execute({
      slug: 'artigos',
      categorias: [],
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
  });
});
