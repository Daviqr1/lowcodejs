import { describe, it, expect, beforeEach } from 'vitest';

import { RowAccessGuardService } from './row-access-guard.service';
import ExtensionInMemoryRepository from '@application/repositories/extension/extension-in-memory.repository';
import { E_EXTENSION_TYPE } from '@application/core/entity.core';
import type { ExtensionUpsertPayload } from '@application/repositories/extension/extension-contract.repository';

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

describe('RowAccessGuardService.getActiveGuardsFor', () => {
  let extensionRepo: ExtensionInMemoryRepository;
  let service: RowAccessGuardService;

  beforeEach(() => {
    extensionRepo = new ExtensionInMemoryRepository();
    service = new RowAccessGuardService(extensionRepo);
  });

  it('retorna lista vazia quando nao ha extensoes ativas para a tabela', async () => {
    const result = await service.getActiveGuardsFor('T_unknown');
    expect(result).toEqual([]);
  });

  it('ignora silenciosamente pluginKey nao mapeado', async () => {
    await extensionRepo.upsert(baseUpsert('plugin-fantasma'));
    const [ext] = await extensionRepo.findMany();
    await extensionRepo.toggleEnabled({ _id: ext._id, enabled: true });
    await extensionRepo.updateTableScope({
      _id: ext._id,
      tableScope: { mode: 'specific', tableIds: ['T1'] },
    });

    const result = await service.getActiveGuardsFor('T1');
    expect(result).toEqual([]);
  });
});
