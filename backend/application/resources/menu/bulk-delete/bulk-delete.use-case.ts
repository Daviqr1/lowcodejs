import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';
import { TrashContractService } from '@application/services/trash/trash-contract.service';

import type { MenuBulkDeletePayload } from '../_shared.validator';

type Response = Either<HTTPException, { deleted: number }>;

@Service()
export default class MenuBulkDeleteUseCase {
  constructor(
    private readonly menuRepository: MenuContractRepository,
    private readonly trash: TrashContractService,
  ) {}

  async execute(payload: MenuBulkDeletePayload): Promise<Response> {
    try {
      const deleted = await this.trash.bulkDelete(
        this.menuRepository,
        payload.ids,
      );

      return right({ deleted });
    } catch (error) {
      console.error('[menu > bulk-delete][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_DELETE_MENUS_ERROR',
        ),
      );
    }
  }
}
