/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IExtension } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';

type Input = { _id: string; enabled: boolean };
type Response = Either<HTTPException, IExtension>;

@Service()
export default class ExtensionToggleUseCase {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
  ) {}

  async execute({ _id, enabled }: Input): Promise<Response> {
    try {
      const existing = await this.extensionRepository.findById(_id);

      if (!existing) {
        return left(
          HTTPException.NotFound(
            'Extensão não encontrada',
            'EXTENSION_NOT_FOUND',
          ),
        );
      }

      if (enabled && !existing.available) {
        return left(
          HTTPException.BadRequest(
            'Extensão indisponível: o manifesto não foi encontrado no boot atual',
            'EXTENSION_UNAVAILABLE',
          ),
        );
      }

      const updated = await this.extensionRepository.toggleEnabled({
        _id,
        enabled,
      });
      return right(updated);
    } catch (error) {
      console.error('[extensions > toggle][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao alternar status da extensão',
          'TOGGLE_EXTENSION_ERROR',
        ),
      );
    }
  }
}
