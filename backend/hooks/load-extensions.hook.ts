import { getInstanceByToken } from 'fastify-decorators';

import { loadExtensions } from '@application/core/extensions/loader';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';
import ExtensionMongooseRepository from '@application/repositories/extension/extension.repository';

export async function LoadExtensionHook(): Promise<void> {
  try {
    const repo = getInstanceByToken<ExtensionContractRepository>(
      ExtensionMongooseRepository,
    );
    await loadExtensions(repo);
  } catch (error) {
    console.error('[Extensions] Falha ao carregar registry no onReady:', error);
  }
}
