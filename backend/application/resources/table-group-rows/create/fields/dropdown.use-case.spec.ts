import { beforeEach, describe, expect, it } from 'vitest';

import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import { makeDropdownField } from '@test/helpers/field-factory.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import GroupRowCreateUseCase from '../create.use-case';

const DROPDOWN_OPTIONS = [
  { id: '1', label: 'Ativo', color: '#00ff00' },
  { id: '2', label: 'Inativo', color: '#ff0000' },
  { id: '3', label: 'Pendente', color: '#ffaa00' },
];

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let sut: GroupRowCreateUseCase;

describe('Group Row Create - DROPDOWN', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    sut = new GroupRowCreateUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
    );
  });

  it('deve criar item no grupo com array de strings valido', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, { slug: 'situacao' });
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
      situacao: ['Ativo'],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.situacao).toEqual(['Ativo']);
  });

  it('deve criar item com multiplas opcoes selecionadas', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, {
      slug: 'tags',
      multiple: true,
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
      tags: ['Ativo', 'Pendente'],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.tags).toEqual(['Ativo', 'Pendente']);
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

    const row = await rowRepository.create({
      table,
      data: { itens: [] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      situacao: 'Ativo',
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

    const row = await rowRepository.create({
      table,
      data: { itens: [] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      situacao: [123, 456],
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
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    expect(result.value.errors).toHaveProperty('situacao');
  });

  it('deve aceitar array vazio quando nao required', async () => {
    const field = makeDropdownField(DROPDOWN_OPTIONS, {
      slug: 'situacao',
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
      situacao: [],
    });

    expect(result.isRight()).toBe(true);
  });
});
