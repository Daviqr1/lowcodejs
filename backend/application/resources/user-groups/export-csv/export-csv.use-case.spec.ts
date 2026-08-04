import type { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import { EXPORT_CSV_LIMIT } from '@application/services/csv-export/csv-export-contract.service';
import CsvExportService from '@application/services/csv-export/csv-export.service';
import DateService from '@application/services/date/date.service';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';
import SlugService from '@application/services/slug/slug.service';

import UserGroupExportCsvUseCase from './export-csv.use-case';

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    let buf = chunk;
    if (typeof chunk === 'string') buf = Buffer.from(chunk);
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

let repo: UserGroupInMemoryRepository;
let userRepo: UserInMemoryRepository;
let groupResolver: GroupResolverService;
let sut: UserGroupExportCsvUseCase;

describe('User Group Export CSV Use Case', () => {
  beforeEach(() => {
    repo = new UserGroupInMemoryRepository();
    userRepo = new UserInMemoryRepository();
    groupResolver = new GroupResolverService(repo);
    sut = new UserGroupExportCsvUseCase(
      repo,
      userRepo,
      groupResolver,
      new CsvExportService(new SlugService(), new DateService()),
    );
  });

  it('deve gerar CSV com BOM, cabeçalho e linhas', async () => {
    await repo.create({
      name: 'Master',
      slug: 'master',
      description: 'Acesso total',
      permissions: ['p1', 'p2', 'p3'],
    });
    await repo.create({
      name: 'Manager',
      slug: 'manager',
      description: null,
      permissions: ['p1'],
    });

    const result = await sut.execute({});

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const csv = await streamToString(result.value);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Nome');
    expect(csv).toContain('Master');
    expect(csv).toContain('Manager');
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
