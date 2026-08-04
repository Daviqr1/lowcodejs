import { Service } from 'fastify-decorators';

import HTTPException from '@application/core/exception.core';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';

import type { RequestHook } from './authentication-middleware-contract.service';
import type { ExtensionActiveOptions } from './extension-active-middleware-contract.service';
import { ExtensionActiveMiddlewareContractService } from './extension-active-middleware-contract.service';

@Service()
export default class ExtensionActiveMiddlewareService implements ExtensionActiveMiddlewareContractService {
  constructor(private readonly repository: ExtensionContractRepository) {}

  handle(options: ExtensionActiveOptions): RequestHook {
    return async (): Promise<void> => {
      const extension = await this.repository.findByKey(
        options.pkg,
        options.type,
        options.extensionId,
      );

      if (!extension || !extension.enabled || !extension.available) {
        throw HTTPException.NotFound(
          'Extensão não encontrada ou inativa',
          'EXTENSION_NOT_ACTIVE',
        );
      }
    };
  }
}
