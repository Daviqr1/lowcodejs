import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';
import { TrashContractService } from '@application/services/trash/trash-contract.service';

import type { MenuBulkRestorePayload } from './bulk-restore.validator';

type Response = Either<HTTPException, { modified: number }>;

@Service()
export default class MenuBulkRestoreUseCase {
  constructor(
    private readonly menuRepository: MenuContractRepository,
    private readonly trash: TrashContractService,
  ) {}

  async execute(payload: MenuBulkRestorePayload): Promise<Response> {
    try {
      const modified = await this.trash.bulkRestore(
        this.menuRepository,
        payload.ids,
      );

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
