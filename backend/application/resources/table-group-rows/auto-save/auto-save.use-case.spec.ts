import { beforeEach, describe, expect, it } from 'vitest';

import type { ITable } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import DraftTableService from '@application/services/draft-table/draft-table.service';
import MongooseIdentifierService from '@application/services/identifier/identifier.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import RowOwnershipService from '@application/services/row-ownership/row-ownership.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import RowPayloadValidatorService from '@application/services/row-payload-validator/row-payload-validator.service';
import TypeGuardService from '@application/services/type-guard/type-guard.service';
import { makeTextShortField } from '@test/helpers/field-factory.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import GroupRowAutoSaveUseCase from './auto-save.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let sut: GroupRowAutoSaveUseCase;

const createTableWithGroup = (): Promise<ITable> =>
  makeTableWithGroup(
    tableRepository,
    'items',
    [makeTextShortField({ _id: 'gf-1', name: 'Descricao', slug: 'descricao' })],
    [],
    { name: 'Pedidos', slug: 'pedidos' },
  );

async function createRowWithItems(table: ITable): Promise<string> {
  const row = await rowRepository.create({
    table,
    data: {
      items: [
        { _id: 'item-1', descricao: 'Item existente', status: 'published' },
      ],
    },
  });
  return row._id;
}

describe('Group Row Auto Save Use Case', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    sut = new GroupRowAutoSaveUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
      new InMemoryRowAccessGuardService(),
      new RowOwnershipService(),
      new RowPayloadValidatorService(new MongooseIdentifierService()),
      new DraftTableService(),
      new TypeGuardService(),
    );
  });

  it('deve criar item incompleto como rascunho (status=draft)', async () => {
    const table = await createTableWithGroup();
    const rowId = await createRowWithItems(table);

    const result = await sut.execute({
      slug: 'pedidos',
      rowId,
      groupSlug: 'items',
      descricao: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value).toHaveProperty('_id');
    expect(result.value).toHaveProperty('status', 'draft');
  });

  it('deve criar item como rascunho mesmo completo (auto-save nunca publica)', async () => {
    const table = await createTableWithGroup();
    const rowId = await createRowWithItems(table);

    const result = await sut.execute({
      slug: 'pedidos',
      rowId,
      groupSlug: 'items',
      descricao: 'Novo item',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value).toHaveProperty('descricao', 'Novo item');
    expect(result.value).toHaveProperty('status', 'draft');
  });

  it('deve atualizar item existente quando _id e informado', async () => {
    const table = await createTableWithGroup();
    const rowId = await createRowWithItems(table);

    const result = await sut.execute({
      slug: 'pedidos',
      rowId,
      groupSlug: 'items',
      _id: 'item-1',
      descricao: 'Atualizado',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value).toHaveProperty('descricao', 'Atualizado');
    expect(result.value).toHaveProperty('status', 'draft');
  });

  it('deve retornar ITEM_NOT_FOUND ao atualizar item inexistente', async () => {
    const table = await createTableWithGroup();
    const rowId = await createRowWithItems(table);

    const result = await sut.execute({
      slug: 'pedidos',
      rowId,
      groupSlug: 'items',
      _id: 'item-inexistente',
      descricao: 'Atualizado',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('ITEM_NOT_FOUND');
  });

  it('deve retornar TABLE_NOT_FOUND quando tabela nao existe', async () => {
    const result = await sut.execute({
      slug: 'inexistente',
      rowId: 'row-1',
      groupSlug: 'items',
      descricao: 'Novo item',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
  });

  it('deve retornar GROUP_NOT_FOUND quando grupo nao existe', async () => {
    await createTableWithGroup();

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: 'row-1',
      groupSlug: 'inexistente',
      descricao: 'Novo item',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('GROUP_NOT_FOUND');
  });
});
