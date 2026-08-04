import { Service } from 'fastify-decorators';

import { ExtensionLoaderContractService } from '@application/services/extension-loader/extension-loader-contract.service';

import { LoadExtensionsHookContractService } from './load-extensions-hook-contract.service';

@Service()
export default class LoadExtensionsHookService implements LoadExtensionsHookContractService {
  constructor(private readonly loader: ExtensionLoaderContractService) {}

  async handle(): Promise<void> {
    try {
      await this.loader.load();
    } catch (error) {
      console.error(
        '[Extensions] Falha ao carregar registry no onReady:',
        error,
      );
    }
  }
}
