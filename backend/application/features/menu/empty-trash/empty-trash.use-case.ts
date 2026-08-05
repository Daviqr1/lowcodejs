import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';
import { TrashContractService } from '@application/services/trash/trash-contract.service';

type Response = Either<HTTPException, { deleted: number }>;

@Service()
export default class MenuEmptyTrashUseCase {
  constructor(
    private readonly menuRepository: MenuContractRepository,
    private readonly trash: TrashContractService,
  ) {}

  async execute(): Promise<Response> {
    try {
      const deleted = await this.trash.emptyTrash(this.menuRepository);

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
