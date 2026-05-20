import { describe, it, expect, beforeEach } from 'vitest';

import { E_EXTENSION_TYPE } from '@application/core/entity.core';

import ExtensionInMemoryRepository from './extension-in-memory.repository';
import type { ExtensionUpsertPayload } from './extension-contract.repository';

const baseUpsert = (extensionId: string): ExtensionUpsertPayload => ({
  pkg: 'core',
  type: E_EXTENSION_TYPE.PLUGIN,
  extensionId,
  name: 'X',
  description: null,
  version: '1.0.0',
  author: null,
  icon: null,
  image: null,
  slot: null,
  route: null,
  submenu: null,
  manifestSnapshot: {},
  requires: { lowcodejs: null, extensions: [] },
});

describe('ExtensionInMemoryRepository.findActiveForTable', () => {
  let repo: ExtensionInMemoryRepository;

  beforeEach(() => {
    repo = new ExtensionInMemoryRepository();
  });

  it('retorna PLUGIN enabled+available cujo tableScope.specific inclui o tableId', async () => {
    await repo.upsert(baseUpsert('visibility-by-role'));
    const [ext] = await repo.findMany();
    await repo.toggleEnabled({ _id: ext._id, enabled: true });
    await repo.updateTableScope({
      _id: ext._id,
      tableScope: { mode: 'specific', tableIds: ['T1'] },
    });

    const result = await repo.findActiveForTable('T1');
    expect(result).toHaveLength(1);
    expect(result[0].extensionId).toBe('visibility-by-role');
  });

  it('retorna vazio quando o plugin esta disabled', async () => {
    await repo.upsert(baseUpsert('visibility-by-role'));
    const [ext] = await repo.findMany();
    // not calling toggleEnabled, so enabled remains false (default)
    await repo.updateTableScope({
      _id: ext._id,
      tableScope: { mode: 'specific', tableIds: ['T1'] },
    });
    const result = await repo.findActiveForTable('T1');
    expect(result).toHaveLength(0);
  });

  it('retorna a extensao quando mode="all" (cobre todas as tabelas)', async () => {
    await repo.upsert(baseUpsert('visibility-by-role'));
    const [ext] = await repo.findMany();
    await repo.toggleEnabled({ _id: ext._id, enabled: true });
    await repo.updateTableScope({
      _id: ext._id,
      tableScope: { mode: 'all', tableIds: [] },
    });
    const result = await repo.findActiveForTable('T1');
    expect(result).toHaveLength(1);
  });
});
