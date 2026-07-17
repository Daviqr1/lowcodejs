import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_SCHEMA_TYPE,
  E_TABLE_STYLE,
} from '@application/core/entity.core';
import type { ITable } from '@application/core/entity.core';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import { DraftTable } from './draft-table';

let tableRepository: TableInMemoryRepository;

const TABLE_DEFAULTS = {
  owner: 'owner-id',
  style: E_TABLE_STYLE.LIST,
  fieldOrderList: [],
  fieldOrderForm: [],
  fields: [],
};

async function makeTable(): Promise<ITable> {
  const table = await tableRepository.create({
    ...TABLE_DEFAULTS,
    name: 'Pedidos',
    slug: 'pedidos',
    _schema: {
      nome: { type: E_SCHEMA_TYPE.STRING, required: true },
      anexos: [
        { type: E_SCHEMA_TYPE.OBJECT_ID, required: true, ref: 'Storage' },
      ],
      items: [
        {
          type: 'Embedded' as const,
          required: true,
          schema: {
            descricao: { type: E_SCHEMA_TYPE.STRING, required: true },
          },
        },
      ],
    },
    groups: [
      {
        slug: 'items',
        name: 'Items',
        _schema: {
          descricao: { type: E_SCHEMA_TYPE.STRING, required: true },
        },
        fields: [
          {
            _id: 'gf-1',
            name: 'Descricao',
            slug: 'descricao',
            type: E_FIELD_TYPE.TEXT_SHORT,
            required: true,
            multiple: false,
            format: E_FIELD_FORMAT.ALPHA_NUMERIC,
            showInFilter: false,
            permissions: buildFieldPermissions(true, true, true),
            widthInForm: 50,
            widthInList: 10,
            widthInDetail: null,
            defaultValue: null,
            locked: false,
            native: false,
            relationship: null,
            dropdown: [],
            category: [],
            group: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            trashed: false,
            trashedAt: null,
          },
        ],
      },
    ],
  });

  return table;
}

describe('DraftTable.from', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
  });

  it('marca todo campo como required:false (top-level, array, embedded e grupo)', async () => {
    const table = await makeTable();

    const draft = DraftTable.from(table);

    expect(JSON.stringify(draft)).not.toContain('"required":true');
  });

  it('preserva os campos do schema (apenas relaxa required)', async () => {
    const table = await makeTable();

    const draft = DraftTable.from(table);

    expect(draft._schema).toHaveProperty('nome');
    expect(draft._schema).toHaveProperty('anexos');
    expect(draft._schema).toHaveProperty('items');
    expect(draft.groups?.[0]?.fields?.[0]?.slug).toBe('descricao');
  });

  it('nao muta a tabela original', async () => {
    const table = await makeTable();

    DraftTable.from(table);

    expect(JSON.stringify(table)).toContain('"required":true');
  });
});
