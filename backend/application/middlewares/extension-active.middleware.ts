/* eslint-disable no-unused-vars */
import { type FastifyRequest } from 'fastify';
import { getInstanceByToken } from 'fastify-decorators';

import { E_EXTENSION_TYPE, type ValueOf } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';
import ExtensionMongooseRepository from '@application/repositories/extension/extension.repository';

type ExtensionType = ValueOf<typeof E_EXTENSION_TYPE>;

type ExtensionActiveOptions = {
  pkg: string;
  type: ExtensionType;
  extensionId: string;
};

/**
 * Garante que a extensão (pkg, type, extensionId) está habilitada e disponível.
 * Lança 404 (com cause EXTENSION_NOT_ACTIVE) caso contrário, blindando rotas
 * registradas por extensões mesmo se a flag for desligada em runtime.
 */
export function ExtensionActiveMiddleware(options: ExtensionActiveOptions) {
  return async function (_request: FastifyRequest): Promise<void> {
    const repo = getInstanceByToken<ExtensionContractRepository>(
      ExtensionMongooseRepository,
    );

    const extension = await repo.findByKey(
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
