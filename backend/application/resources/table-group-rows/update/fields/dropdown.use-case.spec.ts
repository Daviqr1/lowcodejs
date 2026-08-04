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
import { makeDropdownField } from '@test/helpers/field-factory.helper';
import { groupItems, lastItemId } from '@test/helpers/row-data.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import GroupRowUpdateUseCase from '../update.use-case';

const DROPDOWN_OPTIONS = [
  { id: '1', label: 'Ativo', color: '#00ff00' },
  { id: '2', label: 'Inativo', color: '#ff0000' },
  { id: '3', label: 'Pendente', color: '#ffaa00' },
];

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let sut: GroupRowUpdateUseCase;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function createRowWithGroupItem(
  table: ITable,
  groupSlug: string,
  itemData: Record<string, unknown>,
) {
  const row = await rowRepository.create({
    table,
    data: { [groupSlug]: [] },
  });

  const rowWithItem = await rowRepository.addGroupItem({
    table,
    rowId: row._id,
    groupFieldSlug: groupSlug,
    data: itemData,
  });

  const items = groupItems(rowWithItem, groupSlug);
  const itemId = lastItemId(items);

  return { row, rowWithItem, itemId };
}

describe('Group Row Update - DROPDOWN', () => {
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

  it('deve atualizar item com array de strings valido', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, { slug: 'situacao' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      situacao: ['Ativo'],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      situacao: ['Inativo'],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.situacao).toEqual(['Inativo']);
  });

  it('deve rejeitar quando valor nao e array', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, { slug: 'situacao' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      situacao: ['Ativo'],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      situacao: 'Inativo',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve rejeitar quando itens nao sao strings', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, { slug: 'situacao' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      situacao: ['Ativo'],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      situacao: [123, 456],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve permitir update parcial sem campo obrigatorio (skipMissing)', async () => {
    const statusField = makeDropdownField(DROPDOWN_OPTIONS, {
      slug: 'situacao',
      required: true,
    });
    const prioridadeField = makeDropdownField(
      [{ id: '1', label: 'Alta', color: '#ff0000' }],
      { slug: 'prioridade', required: true },
    );
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [statusField, prioridadeField],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      situacao: ['Ativo'],
      prioridade: ['Alta'],
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      situacao: ['Pendente'],
    });

    expect(result.isRight()).toBe(true);
  });
});
