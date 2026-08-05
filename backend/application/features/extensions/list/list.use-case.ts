import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IExtension } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';

type Response = Either<HTTPException, IExtension[]>;

@Service()
export default class ExtensionListUseCase {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
  ) {}

  async execute(): Promise<Response> {
    try {
      const extensions = await this.extensionRepository.findMany();
      return right(extensions);
    } catch (error) {
      console.error('[extensions > list][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_EXTENSIONS_ERROR',
        ),
      );
    }
  }
}
