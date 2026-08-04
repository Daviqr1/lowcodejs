import { beforeEach, describe, expect, it } from 'vitest';

import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import MongooseIdentifierService from '@application/services/identifier/identifier.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import RowOwnershipService from '@application/services/row-ownership/row-ownership.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import RowPayloadValidatorService from '@application/services/row-payload-validator/row-payload-validator.service';
import { makeDateField } from '@test/helpers/field-factory.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import GroupRowCreateUseCase from '../create.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let sut: GroupRowCreateUseCase;

describe('Group Row Create - DATE', () => {
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

  it('deve criar item no grupo com data ISO valida', async () => {
    const field = makeDateField({ slug: 'prazo' });
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
      prazo: '2024-01-15T10:30:00.000Z',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.prazo).toBe('2024-01-15T10:30:00.000Z');
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

    const row = await rowRepository.create({
      table,
      data: { itens: [] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      prazo: '2024-01-15',
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

    const row = await rowRepository.create({
      table,
      data: { itens: [] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      prazo: 'not-a-date',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve rejeitar quando required e valor ausente', async () => {
    const field = makeDateField({ slug: 'prazo', required: true });
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
    expect(result.value.errors).toHaveProperty('prazo');
  });

  it('deve aceitar valor vazio quando nao required', async () => {
    const field = makeDateField({ slug: 'prazo', required: false });
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
      prazo: '',
    });

    expect(result.isRight()).toBe(true);
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

    const row = await rowRepository.create({
      table,
      data: { itens: [] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      prazo: 1705312200000,
    });

    expect(result.isLeft()).toBe(true);
  });
});
