import { beforeEach, describe, expect, it } from 'vitest';

import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryKanbanCommentMentionService from '@application/services/kanban-comment-mention/in-memory-kanban-comment-mention.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import InMemoryScriptExecutionService from '@application/services/script-execution/in-memory-script-execution.service';
import { makeTextLongField } from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import ExtensionInMemoryRepository from '@application/repositories/extension/extension-in-memory.repository';
import TableRowUpdateUseCase from '../update.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowUpdateUseCase;

describe('Table Row Update - TEXT_LONG', () => {
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

  it('deve atualizar row com texto longo valido', async () => {
    const field = makeTextLongField({ slug: 'descricao' });
    const table = await makeTable(tableRepository, [field], {
      slug: 'artigos',
    });

    const row = await rowRepository.create({
      table,
      data: { descricao: '<p>Conteudo antigo</p>' },
    });

    const result = await sut.execute({
      slug: 'artigos',
      _id: row._id,
      descricao: '<p>Conteudo novo com <strong>HTML</strong></p>',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.descricao).toBe(
      '<p>Conteudo novo com <strong>HTML</strong></p>',
    );
  });

  it('deve rejeitar quando valor nao e string', async () => {
    const field = makeTextLongField({ slug: 'descricao' });
    const table = await makeTable(tableRepository, [field], {
      slug: 'artigos',
    });

    const row = await rowRepository.create({
      table,
      data: { descricao: '<p>Texto</p>' },
    });

    const result = await sut.execute({
      slug: 'artigos',
      _id: row._id,
      descricao: 12345,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve pular validacao de campo omitido (skipMissing)', async () => {
    const field = makeTextLongField({ slug: 'descricao', required: true });
    const table = await makeTable(tableRepository, [field], {
      slug: 'artigos',
    });

    const row = await rowRepository.create({
      table,
      data: { descricao: '<p>Texto</p>' },
    });

    const result = await sut.execute({
      slug: 'artigos',
      _id: row._id,
    });

    expect(result.isRight()).toBe(true);
  });
});
