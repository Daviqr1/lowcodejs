import { beforeEach, describe, expect, it } from 'vitest';

import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import MongooseIdentifierService from '@application/services/identifier/identifier.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import RowOwnershipService from '@application/services/row-ownership/row-ownership.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import RowPayloadValidatorService from '@application/services/row-payload-validator/row-payload-validator.service';
import { makeCategoryField } from '@test/helpers/field-factory.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import GroupRowCreateUseCase from '../create.use-case';

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
let rowPasswordService: InMemoryRowPasswordService;
let sut: GroupRowCreateUseCase;

describe('Group Row Create - CATEGORY', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    sut = new GroupRowCreateUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
      new InMemoryRowAccessGuardService(),
      new RowOwnershipService(),
      new RowPayloadValidatorService(new MongooseIdentifierService()),
    );
  });

  it('deve criar item no grupo com array de strings valido', async () => {
    const field = makeCategoryField(CATEGORIES, { slug: 'categorias' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const row = await rowRepository.create({
      table,
      data: { itens: [] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      categorias: ['1', '2.1'],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.categorias).toEqual(['1', '2.1']);
  });

  it('deve rejeitar quando valor nao e array', async () => {
    const field = makeCategoryField(CATEGORIES, { slug: 'categorias' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const row = await rowRepository.create({
      table,
      data: { itens: [] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      categorias: 'Tecnologia',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve rejeitar quando itens nao sao strings', async () => {
    const field = makeCategoryField(CATEGORIES, { slug: 'categorias' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const row = await rowRepository.create({
      table,
      data: { itens: [] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      categorias: [123, 456],
    });

    expect(result.isLeft()).toBe(true);
  });

  it('deve rejeitar quando required e valor ausente', async () => {
    const field = makeCategoryField(CATEGORIES, {
      slug: 'categorias',
      required: true,
    });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const row = await rowRepository.create({
      table,
      data: { itens: [] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
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
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const row = await rowRepository.create({
      table,
      data: { itens: [] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      categorias: [],
    });

    expect(result.isRight()).toBe(true);
  });
});
