import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IExtension } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';

export type ActiveExtension = Omit<IExtension, 'manifestSnapshot'>;

type Input = { role: string };
type Response = Either<HTTPException, ActiveExtension[]>;

@Service()
export default class ExtensionActiveListUseCase {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
  ) {}

  async execute(input: Input): Promise<Response> {
    try {
      const extensions = await this.extensionRepository.findMany({
        enabled: true,
        available: true,
      });

      // Filtra por permissions.view: vazio = visível para todos auth users;
      // não-vazio = role do user precisa estar na lista
      const visible = extensions.filter((extension) => {
        const allowed = extension.permissions?.view ?? [];
        if (allowed.length === 0) return true;
        return allowed.includes(input.role);
      });

      const projected = visible.map<ActiveExtension>((extension) => {
        const { manifestSnapshot: _ignored, ...rest } = extension;
        return rest;
      });

      return right(projected);
    } catch (error) {
      console.error('[extensions > active][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_ACTIVE_EXTENSIONS_ERROR',
        ),
      );
    }
  }
}
