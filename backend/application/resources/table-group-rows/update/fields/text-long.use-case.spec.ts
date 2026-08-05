import { beforeEach, describe, expect, it } from 'vitest';

import type { ITable } from '@application/core/entity.core';
import { E_FIELD_FORMAT } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import MongooseIdentifierService from '@application/services/identifier/identifier.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import RowOwnershipService from '@application/services/row-ownership/row-ownership.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import RowPayloadValidatorService from '@application/services/row-payload-validator/row-payload-validator.service';
import TableGroupService from '@application/services/table-group/table-group.service';
import TypeGuardService from '@application/services/type-guard/type-guard.service';
import { makeTextLongField } from '@test/helpers/field-factory.helper';
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

describe('Group Row Update - TEXT_LONG', () => {
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

  it('deve atualizar item com texto longo valido', async () => {
    const field = makeTextLongField({ slug: 'descricao' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      descricao: '<p>Original</p>',
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      descricao: '<p>Conteudo <strong>atualizado</strong></p>',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.descricao).toBe(
      '<p>Conteudo <strong>atualizado</strong></p>',
    );
  });

  it('deve atualizar item com PLAIN_TEXT', async () => {
    const field = makeTextLongField({
      slug: 'observacoes',
      format: E_FIELD_FORMAT.PLAIN_TEXT,
    });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      observacoes: 'Texto original',
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      observacoes: 'Texto atualizado sem formatacao',
    });

    expect(result.isRight()).toBe(true);
  });

  it('deve rejeitar quando valor nao e string', async () => {
    const field = makeTextLongField({ slug: 'descricao' });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [field],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      descricao: '<p>Original</p>',
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      descricao: 12345,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve permitir update parcial sem campo obrigatorio (skipMissing)', async () => {
    const descField = makeTextLongField({ slug: 'descricao', required: true });
    const notasField = makeTextLongField({
      slug: 'notas',
      required: true,
      format: E_FIELD_FORMAT.PLAIN_TEXT,
    });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [descField, notasField],
      [],
      { slug: 'pedidos' },
    );

    const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
      descricao: '<p>Original</p>',
      notas: 'Nota original',
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
      itemId,
      descricao: '<p>Atualizado</p>',
    });

    expect(result.isRight()).toBe(true);
  });
});
