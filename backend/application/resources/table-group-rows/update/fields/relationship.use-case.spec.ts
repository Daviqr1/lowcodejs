// Specs constroem mocks parciais de entidades e operam sobre dados dinâmicos de
// row (asserção + any); tipá-los por completo aqui seria só ruído de teste.
/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it } from 'vitest';

import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import { makeRelationshipField } from '@test/helpers/field-factory.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import GroupRowUpdateUseCase from '../update.use-case';

const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
const VALID_OBJECT_ID_2 = '507f1f77bcf86cd799439022';

const RELATIONSHIP_CONFIG = {
  table: { _id: '507f1f77bcf86cd799439099', slug: 'produtos' },
  field: { _id: '507f1f77bcf86cd799439088', slug: 'nome' },
  order: 'asc' as const,
};

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

describe('Group Row Update - RELATIONSHIP', () => {
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
    const field = makeRelationshipField(RELATIONSHIP_CONFIG, {
      slug: 'produtos',
    });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      produtos: [VALID_OBJECT_ID],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      produtos: [VALID_OBJECT_ID_2],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.produtos).toEqual([VALID_OBJECT_ID_2]);
  });

  // RELATIONSHIP não é mais validado no payload do row (gerido via links).
  it('deve permitir update parcial sem campo obrigatorio (skipMissing)', async () => {
    const produtosField = makeRelationshipField(RELATIONSHIP_CONFIG, {
      slug: 'produtos',
      required: true,
    });
    const fornecedoresField = makeRelationshipField(
      {
        table: { _id: '507f1f77bcf86cd799439077', slug: 'fornecedores' },
        field: { _id: '507f1f77bcf86cd799439066', slug: 'nome' },
        order: 'asc' as const,
      },
      { slug: 'fornecedores', required: true },
    );
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [produtosField, fornecedoresField],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      produtos: [VALID_OBJECT_ID],
      fornecedores: [VALID_OBJECT_ID_2],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      produtos: [VALID_OBJECT_ID_2],
    });

    expect(result.isRight()).toBe(true);
  });
});
