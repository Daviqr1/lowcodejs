import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';
import { TrashContractService } from '@application/services/trash/trash-contract.service';

import type { UserGroupBulkRestorePayload } from './bulk-restore.validator';

type Response = Either<HTTPException, { modified: number }>;

@Service()
export default class UserGroupBulkRestoreUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly trash: TrashContractService,
  ) {}

  async execute(payload: UserGroupBulkRestorePayload): Promise<Response> {
    try {
      const modified = await this.trash.bulkRestore(
        this.userGroupRepository,
        payload.ids,
      );

      return right({ modified });
    } catch (error) {
      console.error('[user-groups > bulk-restore][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_RESTORE_GROUPS_ERROR',
        ),
      );
    }
  }
}
