import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { TrashContractService } from '@application/services/trash/trash-contract.service';

import type { UserBulkRestorePayload } from '../_shared.validator';

type Response = Either<HTTPException, { modified: number }>;

@Service()
export default class UserBulkRestoreUseCase {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly trash: TrashContractService,
  ) {}

  async execute(payload: UserBulkRestorePayload): Promise<Response> {
    try {
      const modified = await this.trash.bulkRestore(
        this.userRepository,
        payload.ids,
      );

      return right({ modified });
    } catch (error) {
      console.error('[users > bulk-restore][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_RESTORE_USERS_ERROR',
        ),
      );
    }
  }
}
