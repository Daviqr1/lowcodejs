// Specs constroem mocks parciais de entidades e operam sobre dados dinâmicos de
// row (asserção + any); tipá-los por completo aqui seria só ruído de teste.
/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it } from 'vitest';

import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import { makeUserField } from '@test/helpers/field-factory.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import GroupRowUpdateUseCase from '../update.use-case';

const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
const VALID_OBJECT_ID_2 = '507f1f77bcf86cd799439022';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let sut: GroupRowUpdateUseCase;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function createRowWithGroupItem(
  table: Record<string, unknown>,
  groupSlug: string,
  itemData: Record<string, unknown>,
) {
  const row = await rowRepository.create({
    table: table as any,
    data: { [groupSlug]: [] },
  });

  const rowWithItem = await rowRepository.addGroupItem({
    table: table as any,
    rowId: row._id,
    groupFieldSlug: groupSlug,
    data: itemData,
  });

  const items = rowWithItem[groupSlug] as Array<Record<string, unknown>>;
  const itemId = items[items.length - 1]._id as string;

  return { row, rowWithItem, itemId };
}

describe('Group Row Update - USER', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    sut = new GroupRowUpdateUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
    );
  });

  it('deve atualizar item com array de ObjectIds validos', async () => {
    const field = makeUserField({ slug: 'responsaveis' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      responsaveis: [VALID_OBJECT_ID],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      responsaveis: [VALID_OBJECT_ID_2],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.responsaveis).toEqual([VALID_OBJECT_ID_2]);
  });

  it('deve rejeitar quando valor nao e array', async () => {
    const field = makeUserField({ slug: 'responsaveis' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      responsaveis: [VALID_OBJECT_ID],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      responsaveis: VALID_OBJECT_ID,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve rejeitar quando itens nao sao ObjectIds validos', async () => {
    const field = makeUserField({ slug: 'responsaveis' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      responsaveis: [VALID_OBJECT_ID],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      responsaveis: ['not-valid-id'],
    });

    expect(result.isLeft()).toBe(true);
  });

  it('deve permitir update parcial sem campo obrigatorio (skipMissing)', async () => {
    const responsaveisField = makeUserField({
      slug: 'responsaveis',
      required: true,
    });
    const revisoresField = makeUserField({
      slug: 'revisores',
      name: 'Revisores',
      required: true,
    });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [responsaveisField, revisoresField],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      responsaveis: [VALID_OBJECT_ID],
      revisores: [VALID_OBJECT_ID_2],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      responsaveis: [VALID_OBJECT_ID_2],
    });

    expect(result.isRight()).toBe(true);
  });
});
