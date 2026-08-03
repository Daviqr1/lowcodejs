import type { Readable } from 'node:stream';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  type IField,
} from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';

import GroupRowExportCsvUseCase from './export-csv.use-case';

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    let buf = chunk;
    if (typeof chunk === 'string') buf = Buffer.from(chunk);
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

const buildField = (overrides: Partial<IField>): IField => ({
  _id: overrides.slug ?? 'f',
  name: 'Field',
  slug: 'field',
  type: E_FIELD_TYPE.TEXT_SHORT,
  required: false,
  multiple: false,
  format: null,
  showInFilter: false,
  permissions: buildFieldPermissions(true, true, true),
  widthInForm: null,
  widthInList: 10,
  widthInDetail: null,
  defaultValue: null,
  relationship: null,
  dropdown: [],
  category: [],
  group: null,
  native: false,
  locked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  trashed: false,
  trashedAt: null,
  ...overrides,
});

let tableRepo: TableInMemoryRepository;
let rowRepo: RowInMemoryRepository;
let sut: GroupRowExportCsvUseCase;

describe('Group Row Export CSV Use Case', () => {
  beforeEach(() => {
    tableRepo = new TableInMemoryRepository();
    rowRepo = new RowInMemoryRepository();
    sut = new GroupRowExportCsvUseCase(
      tableRepo,
      rowRepo,
      new InMemoryRowPasswordService(),
      new InMemoryRowAccessGuardService(),
    );
  });

  it('deve gerar CSV com os itens do grupo embutido', async () => {
    const groupFields: IField[] = [
      buildField({ name: 'Item', slug: 'item' }),
      buildField({ name: 'Qtd', slug: 'qtd' }),
    ];

    const groupFieldDef = buildField({
      name: 'Itens',
      slug: 'itens',
      type: E_FIELD_TYPE.FIELD_GROUP,
      group: { slug: 'itens' },
    });

    const table = await tableRepo.create({
      name: 'Pedidos',
      slug: 'pedidos',
      _schema: {},
      fields: [groupFieldDef._id],
      groups: [
        {
          slug: 'itens',
          name: 'Itens',
          fields: groupFields,
          _schema: {},
        },
      ],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });
    // popula o field de grupo (o export lê metadados de table.fields)
    table.fields = [groupFieldDef];

    const row = await rowRepo.create({
      table,
      data: {
        itens: [
          { _id: 'i1', item: 'Cafe', qtd: 3 },
          { _id: 'i2', item: 'Pao', qtd: 5 },
        ],
      },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      rowId: row._id,
      groupSlug: 'itens',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const csv = await streamToString(result.value);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Item');
    expect(csv).toContain('Cafe');
    expect(csv).toContain('Pao');
  });

  it('deve retornar TABLE_NOT_FOUND', async () => {
    const result = await sut.execute({
      slug: 'x',
      rowId: 'r',
      groupSlug: 'g',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
  });
});
