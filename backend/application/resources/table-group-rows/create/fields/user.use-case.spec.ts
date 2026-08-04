import { beforeEach, describe, expect, it } from 'vitest';

import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import MongooseIdentifierService from '@application/services/identifier/identifier.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import RowOwnershipService from '@application/services/row-ownership/row-ownership.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import RowPayloadValidatorService from '@application/services/row-payload-validator/row-payload-validator.service';
import { makeUserField } from '@test/helpers/field-factory.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import GroupRowCreateUseCase from '../create.use-case';

const VALID_OBJECT_ID = '507f1f77bcf86cd799439011';
const VALID_OBJECT_ID_2 = '507f1f77bcf86cd799439022';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let sut: GroupRowCreateUseCase;

describe('Group Row Create - USER', () => {
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

  it('deve criar item no grupo com array de ObjectIds validos', async () => {
    const field = makeUserField({ slug: 'responsaveis' });
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
      responsaveis: [VALID_OBJECT_ID],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.responsaveis).toEqual([VALID_OBJECT_ID]);
  });

  it('deve criar item com multiplos usuarios', async () => {
    const field = makeUserField({ slug: 'responsaveis', multiple: true });
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
      responsaveis: [VALID_OBJECT_ID, VALID_OBJECT_ID_2],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.responsaveis).toHaveLength(2);
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

    const row = await rowRepository.create({
      table,
      data: { itens: [] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
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

    const row = await rowRepository.create({
      table,
      data: { itens: [] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      responsaveis: ['not-valid-id'],
    });

    expect(result.isLeft()).toBe(true);
  });

  it('deve rejeitar quando required e valor ausente', async () => {
    const field = makeUserField({ slug: 'responsaveis', required: true });
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
    expect(result.value.errors).toHaveProperty('responsaveis');
  });

  it('deve aceitar array vazio quando nao required', async () => {
    const field = makeUserField({ slug: 'responsaveis', required: false });
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
      responsaveis: [],
    });

    expect(result.isRight()).toBe(true);
  });
});
