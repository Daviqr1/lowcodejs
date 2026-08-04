import { getInstanceByToken } from 'fastify-decorators';

import { ExtensionLoaderContractService } from '@application/services/extension-loader/extension-loader-contract.service';
import ExtensionLoaderService from '@application/services/extension-loader/extension-loader.service';

export async function LoadExtensionHook(): Promise<void> {
  try {
    await getInstanceByToken<ExtensionLoaderContractService>(
      ExtensionLoaderService,
    ).load();
  } catch (error) {
    console.error('[Extensions] Falha ao carregar registry no onReady:', error);
  }
}
