import { beforeEach, describe, expect, it } from 'vitest';

import type { ITable } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import MongooseIdentifierService from '@application/services/identifier/identifier.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import RowOwnershipService from '@application/services/row-ownership/row-ownership.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import RowPayloadValidatorService from '@application/services/row-payload-validator/row-payload-validator.service';
import TableGroupService from '@application/services/table-group/table-group.service';
import TypeGuardService from '@application/services/type-guard/type-guard.service';
import { makeDateField } from '@test/helpers/field-factory.helper';
import { makeRowWithGroupItem } from '@test/helpers/row-data.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import GroupRowUpdateUseCase from '../update.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let sut: GroupRowUpdateUseCase;

const createRowWithGroupItem = (
  table: ITable,
  groupSlug: string,
  itemData: Record<string, unknown>,
): ReturnType<typeof makeRowWithGroupItem> =>
  makeRowWithGroupItem(rowRepository, table, groupSlug, itemData);

describe('Group Row Update - DATE', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    sut = new GroupRowUpdateUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
      new InMemoryRowAccessGuardService(),
      new RowOwnershipService(),
      new RowPayloadValidatorService(new MongooseIdentifierService()),
      new TypeGuardService(),
      new TableGroupService(tableRepository),
    );
  });

  it('deve atualizar item com data ISO valida', async () => {
    const field = makeDateField({ slug: 'prazo' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      prazo: '2024-01-15T10:30:00.000Z',
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      prazo: '2024-06-20T14:00:00.000Z',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.prazo).toBe('2024-06-20T14:00:00.000Z');
  });

  it('deve aceitar data sem horario', async () => {
    const field = makeDateField({ slug: 'prazo' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      prazo: '2024-01-15',
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      prazo: '2024-06-20',
    });

    expect(result.isRight()).toBe(true);
  });

  it('deve rejeitar data invalida', async () => {
    const field = makeDateField({ slug: 'prazo' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      prazo: '2024-01-15',
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      prazo: 'not-a-date',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve rejeitar quando valor nao e string', async () => {
    const field = makeDateField({ slug: 'prazo' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      prazo: '2024-01-15',
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      prazo: 1705312200000,
    });

    expect(result.isLeft()).toBe(true);
  });

  it('deve permitir update parcial sem campo obrigatorio (skipMissing)', async () => {
    const prazoField = makeDateField({ slug: 'prazo', required: true });
    const inicioField = makeDateField({
      slug: 'inicio',
      name: 'Inicio',
      required: true,
    });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [prazoField, inicioField],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      prazo: '2024-01-15',
      inicio: '2024-01-10',
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      prazo: '2024-06-20',
    });

    expect(result.isRight()).toBe(true);
  });
});
