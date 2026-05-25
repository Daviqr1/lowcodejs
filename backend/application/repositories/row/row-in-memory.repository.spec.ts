import { describe, it, expect, beforeEach } from 'vitest';

import RowInMemoryRepository from './row-in-memory.repository';

describe('RowInMemoryRepository.bulkSetMissingField', () => {
  let repo: RowInMemoryRepository;
  const table: any = { slug: 't1', _id: 'T1', fields: [] };

  beforeEach(() => {
    repo = new RowInMemoryRepository();
  });

  it('seta valor default em rows que nao tem o field', async () => {
    await repo.create({ table, data: { nome: 'A' } });
    await repo.create({ table, data: { nome: 'B', visibility: 'SIGILOSO' } });

    const result = await repo.bulkSetMissingField(
      table,
      'visibility',
      'PUBLIC',
    );
    expect(result.modified).toBe(1);

    const all = await repo.findAllRaw(table);
    const a = all.find((r) => (r as any).nome === 'A');
    const b = all.find((r) => (r as any).nome === 'B');
    expect((a as any).visibility).toBe('PUBLIC');
    expect((b as any).visibility).toBe('SIGILOSO');
  });

  it('idempotente: rodar 2x nao muda na 2a vez', async () => {
    await repo.create({ table, data: { nome: 'A' } });
    await repo.bulkSetMissingField(table, 'visibility', 'PUBLIC');

    const second = await repo.bulkSetMissingField(
      table,
      'visibility',
      'PUBLIC',
    );
    expect(second.modified).toBe(0);
  });

  it('nao modifica rows com trashed=true', async () => {
    await repo.create({ table, data: { nome: 'A' } });
    // trash the row
    const all = await repo.findAllRaw(table);
    const rowId = (all[0] as any)._id;
    await repo.bulkTrash({ table, ids: [rowId] });

    const result = await repo.bulkSetMissingField(
      table,
      'visibility',
      'PUBLIC',
    );
    expect(result.matched).toBe(0);
    expect(result.modified).toBe(0);
  });

  it('retorna matched e modified corretos para colecao vazia', async () => {
    const result = await repo.bulkSetMissingField(
      table,
      'visibility',
      'PUBLIC',
    );
    expect(result.matched).toBe(0);
    expect(result.modified).toBe(0);
  });
});
