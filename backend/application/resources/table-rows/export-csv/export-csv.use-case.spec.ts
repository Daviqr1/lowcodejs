// Spec constrói mocks parciais de entidades do domínio via asserção.
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import type { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EXPORT_CSV_LIMIT } from '@application/core/csv/csv-stream';
import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  type IField,
} from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import TableRowExportCsvUseCase from './export-csv.use-case';

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    let buf = chunk;
    if (typeof chunk === 'string') buf = Buffer.from(chunk);
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

let tableRepo: TableInMemoryRepository;
let rowRepo: RowInMemoryRepository;
let sut: TableRowExportCsvUseCase;

const buildField = (overrides: Partial<IField>): IField =>
  ({
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
  }) as IField;

describe('Table Row Export CSV Use Case', () => {
  beforeEach(() => {
    tableRepo = new TableInMemoryRepository();
    rowRepo = new RowInMemoryRepository();
    sut = new TableRowExportCsvUseCase(tableRepo, rowRepo);
  });

  it('deve gerar CSV com colunas dinâmicas dos fields da tabela', async () => {
    const fields: IField[] = [
      buildField({ name: 'Nome', slug: 'nome', type: E_FIELD_TYPE.TEXT_SHORT }),
      buildField({
        name: 'Status',
        slug: 'status',
        type: E_FIELD_TYPE.DROPDOWN,
      }),
    ];

    const table = await tableRepo.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: fields as unknown as string[],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    await rowRepo.create({ table, data: { nome: 'Alice', status: 'ATIVO' } });
    await rowRepo.create({ table, data: { nome: 'Bob', status: 'INATIVO' } });

    const result = await sut.execute({ slug: 'clientes' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const csv = await streamToString(result.value);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Nome","Status"');
    expect(csv).toContain('Alice');
    expect(csv).toContain('Bob');
    expect(csv).toContain('ATIVO');
  });

  it('deve retornar TABLE_NOT_FOUND quando tabela não existir', async () => {
    const result = await sut.execute({ slug: 'non-existent' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
  });

  it('deve retornar EXPORT_LIMIT_EXCEEDED quando count exceder o cap', async () => {
    await tableRepo.create({
      name: 'Big',
      slug: 'big',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    vi.spyOn(rowRepo, 'count').mockResolvedValue(EXPORT_CSV_LIMIT + 1);

    const result = await sut.execute({ slug: 'big' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(422);
    expect(result.value.cause).toBe('EXPORT_LIMIT_EXCEEDED');
  });
});
