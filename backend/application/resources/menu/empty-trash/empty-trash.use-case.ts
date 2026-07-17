import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';

type Response = Either<HTTPException, { deleted: number }>;

@Service()
export default class MenuEmptyTrashUseCase {
  constructor(private readonly menuRepository: MenuContractRepository) {}

  async execute(): Promise<Response> {
    try {
      const trashed = await this.menuRepository.findManyTrashed();

      if (trashed.length === 0) return right({ deleted: 0 });

      const ids = trashed.map((m) => m._id);
      const deleted = await this.menuRepository.deleteMany(ids);

      return right({ deleted });
    } catch (error) {
      console.error('[menu > empty-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'EMPTY_TRASH_MENUS_ERROR',
        ),
      );
    }
  }
}
