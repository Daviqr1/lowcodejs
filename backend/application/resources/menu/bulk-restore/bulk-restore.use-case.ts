import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';

import type { MenuBulkRestorePayload } from './bulk-restore.validator';

type Response = Either<HTTPException, { modified: number }>;

@Service()
export default class MenuBulkRestoreUseCase {
  constructor(private readonly menuRepository: MenuContractRepository) {}

  async execute(payload: MenuBulkRestorePayload): Promise<Response> {
    try {
      const modified = await this.menuRepository.updateMany({
        _ids: payload.ids,
        filterTrashed: true,
        data: {
          trashed: false,
          trashedAt: null,
        },
      });

      return right({ modified });
    } catch (error) {
      console.error('[menu > bulk-restore][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_RESTORE_MENUS_ERROR',
        ),
      );
    }
  }
}
