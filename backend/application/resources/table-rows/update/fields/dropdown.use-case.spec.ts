import { beforeEach, describe, expect, it } from 'vitest';

import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryKanbanCommentMentionService from '@application/services/kanban-comment-mention/in-memory-kanban-comment-mention.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import InMemoryScriptExecutionService from '@application/services/script-execution/in-memory-script-execution.service';
import { makeDropdownField } from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import ExtensionInMemoryRepository from '@application/repositories/extension/extension-in-memory.repository';
import TableRowUpdateUseCase from '../update.use-case';

const DROPDOWN_OPTIONS = [
  { id: '1', label: 'Ativo', color: '#00ff00' },
  { id: '2', label: 'Inativo', color: '#ff0000' },
  { id: '3', label: 'Pendente', color: '#ffaa00' },
];

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowUpdateUseCase;

describe('Table Row Update - DROPDOWN', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    scriptExecutionService = new InMemoryScriptExecutionService();

    sut = new TableRowUpdateUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
      scriptExecutionService,
      new InMemoryKanbanCommentMentionService(),
      new RowAccessGuardService(new ExtensionInMemoryRepository()),
    );
  });

  it('deve atualizar row com array de strings valido', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, { slug: 'status' });
    const table = await makeTable(tableRepository, [field], {
      slug: 'tarefas',
    });

    const row = await rowRepository.create({
      table,
      data: { status: ['Ativo'] },
    });

    const result = await sut.execute({
      slug: 'tarefas',
      _id: row._id,
      status: ['Inativo'],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.status).toEqual(['Inativo']);
  });

  it('deve rejeitar quando valor nao e array', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, { slug: 'status' });
    const table = await makeTable(tableRepository, [field], {
      slug: 'tarefas',
    });

    const row = await rowRepository.create({
      table,
      data: { status: ['Ativo'] },
    });

    const result = await sut.execute({
      slug: 'tarefas',
      _id: row._id,
      status: 'Inativo',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve pular validacao de campo omitido (skipMissing)', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, {
      slug: 'status',
      required: true,
    });
    const table = await makeTable(tableRepository, [field], {
      slug: 'tarefas',
    });

    const row = await rowRepository.create({
      table,
      data: { status: ['Ativo'] },
    });

    const result = await sut.execute({
      slug: 'tarefas',
      _id: row._id,
    });

    expect(result.isRight()).toBe(true);
  });
});
