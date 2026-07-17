import type { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EXPORT_CSV_LIMIT } from '@application/core/csv/csv-stream';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';

import UserExportCsvUseCase from './export-csv.use-case';

const BOM = '﻿';

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    let buf = chunk;
    if (typeof chunk === 'string') buf = Buffer.from(chunk);
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

let repo: UserInMemoryRepository;
let sut: UserExportCsvUseCase;

describe('User Export CSV Use Case', () => {
  beforeEach(() => {
    repo = new UserInMemoryRepository();
    sut = new UserExportCsvUseCase(repo);
  });

  it('deve gerar CSV com BOM, cabeçalho e linhas para todos os usuários', async () => {
    await repo.create({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret',
      group: 'g1',
    });
    await repo.create({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'secret',
      group: 'g2',
    });

    const result = await sut.execute({});

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const csv = await streamToString(result.value);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"ID","Nome","Email","Grupo","Status"');
    expect(csv).toContain('alice@example.com');
    expect(csv).toContain('bob@example.com');

    const dataLines = csv
      .replace(new RegExp(`^${BOM}`), '')
      .split('\n')
      .filter((l) => l.trim().length > 0);
    expect(dataLines).toHaveLength(3);
  });

  it('deve respeitar filtro de busca', async () => {
    await repo.create({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret',
      group: 'g1',
    });
    await repo.create({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'secret',
      group: 'g2',
    });

    const result = await sut.execute({ search: 'alice' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    const csv = await streamToString(result.value);
    expect(csv).toContain('alice@example.com');
    expect(csv).not.toContain('bob@example.com');
  });

  it('deve retornar EXPORT_LIMIT_EXCEEDED quando count exceder o cap', async () => {
    const countSpy = vi
      .spyOn(repo, 'count')
      .mockResolvedValue(EXPORT_CSV_LIMIT + 1);

    const result = await sut.execute({});

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(422);
    expect(result.value.cause).toBe('EXPORT_LIMIT_EXCEEDED');
    expect(countSpy).toHaveBeenCalled();
  });

  it('deve retornar EXPORT_USER_CSV_ERROR quando count falhar', async () => {
    vi.spyOn(repo, 'count').mockRejectedValueOnce(new Error('db down'));

    const result = await sut.execute({});

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('EXPORT_USER_CSV_ERROR');
  });
});
