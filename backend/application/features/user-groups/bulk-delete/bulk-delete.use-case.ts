import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { SYSTEM_GROUP_SLUGS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';
import { TrashContractService } from '@application/services/trash/trash-contract.service';

import type { UserGroupBulkDeletePayload } from '../_shared.validator';

type Response = Either<HTTPException, { deleted: number }>;

@Service()
export default class UserGroupBulkDeleteUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly trash: TrashContractService,
  ) {}

  async execute(payload: UserGroupBulkDeletePayload): Promise<Response> {
    try {
      const deleted = await this.trash.bulkDelete(
        this.userGroupRepository,
        payload.ids,
        async (group) => {
          if (SYSTEM_GROUP_SLUGS.has(group.slug)) return false;

          const usersInGroup = await this.userRepository.count({
            group: group._id,
          });

          return usersInGroup === 0;
        },
      );

      return right({ deleted });
    } catch (error) {
      console.error('[user-groups > bulk-delete][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_DELETE_GROUPS_ERROR',
        ),
      );
    }
  }
}
