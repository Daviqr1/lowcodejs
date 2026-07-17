import type { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EXPORT_CSV_LIMIT } from '@application/core/csv/csv-stream';
import { E_TABLE_STYLE, E_TABLE_TYPE } from '@application/core/entity.core';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import TableExportCsvUseCase from './export-csv.use-case';

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    let buf = chunk;
    if (typeof chunk === 'string') buf = Buffer.from(chunk);
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

let repo: TableInMemoryRepository;
let sut: TableExportCsvUseCase;

describe('Table Export CSV Use Case', () => {
  beforeEach(() => {
    repo = new TableInMemoryRepository();
    sut = new TableExportCsvUseCase(repo);
  });

  it('deve gerar CSV com BOM e linhas das tabelas', async () => {
    await repo.create({
      name: 'Clientes',
      slug: 'clientes',
      owner: 'user-1',
      type: E_TABLE_TYPE.TABLE,
      style: E_TABLE_STYLE.LIST,
    });

    const result = await sut.execute({});

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const csv = await streamToString(result.value);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Clientes');
    expect(csv).toContain('clientes');
  });

  it('deve retornar EXPORT_LIMIT_EXCEEDED quando count exceder o cap', async () => {
    vi.spyOn(repo, 'count').mockResolvedValue(EXPORT_CSV_LIMIT + 1);

    const result = await sut.execute({});

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(422);
    expect(result.value.cause).toBe('EXPORT_LIMIT_EXCEEDED');
  });
});
