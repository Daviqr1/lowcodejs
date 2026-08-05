import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { SYSTEM_GROUP_SLUGS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';
import { TrashContractService } from '@application/services/trash/trash-contract.service';

import type { UserGroupBulkTrashPayload } from '../_shared.validator';

type Response = Either<HTTPException, { modified: number }>;

@Service()
export default class UserGroupBulkTrashUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly trash: TrashContractService,
  ) {}

  async execute(payload: UserGroupBulkTrashPayload): Promise<Response> {
    try {
      const eligibleIds: string[] = [];
      for (const id of payload.ids) {
        const group = await this.userGroupRepository.findById(id);
        if (!group) continue;
        if (group.trashed) continue;
        if (SYSTEM_GROUP_SLUGS.has(group.slug)) continue;

        const usersInGroup = await this.userRepository.count({
          group: group._id,
        });
        if (usersInGroup > 0) continue;

        eligibleIds.push(group._id);
      }

      if (eligibleIds.length === 0) return right({ modified: 0 });

      const modified = await this.trash.bulkTrash(
        this.userGroupRepository,
        eligibleIds,
      );

      return right({ modified });
    } catch (error) {
      console.error('[user-groups > bulk-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_TRASH_GROUPS_ERROR',
        ),
      );
    }
  }
}
