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
import { makeDropdownField } from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import TableRowCreateUseCase from '../create.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let userRepository: UserInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowCreateUseCase;

const DROPDOWN_OPTIONS = [
  { id: '1', label: 'Ativo', color: '#00ff00' },
  { id: '2', label: 'Inativo', color: '#ff0000' },
  { id: '3', label: 'Pendente', color: '#ffaa00' },
];

describe('Table Row Create - DROPDOWN', () => {
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
    const field = makeDropdownField(DROPDOWN_OPTIONS, { slug: 'situacao' });
    await makeTable(tableRepository, [field], { slug: 'tarefas' });

    const result = await sut.execute({
      slug: 'tarefas',
      situacao: ['Ativo'],
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.situacao).toEqual(['Ativo']);
  });

  it('deve criar row com multiplas opcoes selecionadas', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, {
      slug: 'tags',
      multiple: true,
    });
    await makeTable(tableRepository, [field], { slug: 'tarefas' });

    const result = await sut.execute({
      slug: 'tarefas',
      tags: ['Ativo', 'Pendente'],
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.tags).toEqual(['Ativo', 'Pendente']);
  });

  it('deve rejeitar quando valor nao e array', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, { slug: 'situacao' });
    await makeTable(tableRepository, [field], { slug: 'tarefas' });

    const result = await sut.execute({
      slug: 'tarefas',
      situacao: 'Ativo',
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve rejeitar quando itens nao sao strings', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, { slug: 'situacao' });
    await makeTable(tableRepository, [field], { slug: 'tarefas' });

    const result = await sut.execute({
      slug: 'tarefas',
      situacao: [123, 456],
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve rejeitar quando required e valor ausente', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, {
      slug: 'situacao',
      required: true,
    });
    await makeTable(tableRepository, [field], { slug: 'tarefas' });

    const result = await sut.execute({
      slug: 'tarefas',
      creator: 'user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    expect(result.value.errors).toHaveProperty('situacao');
  });

  it('deve aceitar array vazio quando nao required', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, {
      slug: 'situacao',
      required: false,
    });
    await makeTable(tableRepository, [field], { slug: 'tarefas' });

    const result = await sut.execute({
      slug: 'tarefas',
      situacao: [],
      creator: 'user-id',
    });

    expect(result.isRight()).toBe(true);
  });
});
