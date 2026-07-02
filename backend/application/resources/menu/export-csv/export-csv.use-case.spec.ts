import type { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EXPORT_CSV_LIMIT } from '@application/core/csv/csv-stream';
import { E_MENU_ITEM_TYPE } from '@application/core/entity.core';
import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';

import MenuExportCsvUseCase from './export-csv.use-case';

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    let buf = chunk;
    if (typeof chunk === 'string') buf = Buffer.from(chunk);
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

let repo: MenuInMemoryRepository;
let sut: MenuExportCsvUseCase;

describe('Menu Export CSV Use Case', () => {
  beforeEach(() => {
    repo = new MenuInMemoryRepository();
    sut = new MenuExportCsvUseCase(repo);
  });

  it('deve gerar CSV com BOM e linhas dos menus', async () => {
    await repo.create({
      name: 'Tabelas',
      slug: 'tabelas',
      type: E_MENU_ITEM_TYPE.TABLE,
      order: 1,
    });
    await repo.create({
      name: 'Externo',
      slug: 'externo',
      type: E_MENU_ITEM_TYPE.EXTERNAL,
      url: 'https://example.com',
      order: 2,
    });

    const result = await sut.execute({});

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const csv = await streamToString(result.value);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Tabelas');
    expect(csv).toContain('Externo');
    expect(csv).toContain('https://example.com');
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
