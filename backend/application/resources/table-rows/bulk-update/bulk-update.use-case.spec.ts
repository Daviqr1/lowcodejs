import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  E_TABLE_COLLABORATION,
  E_TABLE_STYLE,
  E_TABLE_VISIBILITY,
} from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryKanbanCommentMentionService from '@application/services/kanban-comment-mention/in-memory-kanban-comment-mention.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import InMemoryScriptExecutionService from '@application/services/script-execution/in-memory-script-execution.service';

import BulkUpdateUseCase from './bulk-update.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let kanbanCommentMentionService: InMemoryKanbanCommentMentionService;
let sut: BulkUpdateUseCase;

async function createTable(): ReturnType<TableInMemoryRepository['create']> {
  return tableInMemoryRepository.create({
    name: 'Clientes',
    slug: 'clientes',
    _schema: {},
    fields: [],
    owner: 'owner-id',
    administrators: [],
    style: E_TABLE_STYLE.LIST,
    visibility: E_TABLE_VISIBILITY.RESTRICTED,
    collaboration: E_TABLE_COLLABORATION.RESTRICTED,
    fieldOrderList: [],
    fieldOrderForm: [],
  });
}

describe('Bulk Update Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();
    scriptExecutionService = new InMemoryScriptExecutionService();
    kanbanCommentMentionService = new InMemoryKanbanCommentMentionService();

    sut = new BulkUpdateUseCase(
      tableInMemoryRepository,
      rowRepository,
      rowPasswordService,
      scriptExecutionService,
      kanbanCommentMentionService,
    );
    vi.clearAllMocks();
  });

  it('deve atualizar o mesmo campo em varios registros', async () => {
    const table = await createTable();

    const row1 = await rowRepository.create({
      table,
      data: { status: 'aberto' },
    });
    const row2 = await rowRepository.create({
      table,
      data: { status: 'aberto' },
    });

    const result = await sut.execute({
      slug: 'clientes',
      ids: [row1._id, row2._id],
      data: { status: 'em-andamento' },
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.modified).toBe(2);
      expect(result.value.errors).toBeUndefined();
    }

    const updated1 = await rowRepository.findOne({
      table,
      query: { _id: row1._id },
    });
    expect((updated1 as Record<string, unknown>).status).toBe('em-andamento');
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      slug: 'non-existent',
      ids: ['row-id'],
      data: { status: 'x' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    }
  });

  it('deve ser best-effort: ids invalidos entram em errors sem abortar o lote', async () => {
    const table = await createTable();
    const row1 = await rowRepository.create({
      table,
      data: { status: 'aberto' },
    });

    const result = await sut.execute({
      slug: 'clientes',
      ids: [row1._id, 'inexistente'],
      data: { status: 'concluido' },
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.modified).toBe(1);
      expect(result.value.errors).toBeDefined();
      expect(result.value.errors?.['inexistente']).toBe('ROW_NOT_FOUND');
    }
  });

  it('deve retornar erro BULK_UPDATE_ROWS_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      slug: 'some-slug',
      ids: ['row-id'],
      data: { status: 'x' },
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('BULK_UPDATE_ROWS_ERROR');
    }
  });
});
