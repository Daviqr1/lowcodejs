import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { SYSTEM_GROUP_SLUGS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';

import type { UserGroupBulkDeletePayload } from './bulk-delete.validator';

type Response = Either<HTTPException, { deleted: number }>;

@Service()
export default class UserGroupBulkDeleteUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly userRepository: UserContractRepository,
  ) {}

  async execute(payload: UserGroupBulkDeletePayload): Promise<Response> {
    try {
      const eligibleIds: string[] = [];
      for (const id of payload.ids) {
        const group = await this.userGroupRepository.findById(id, {
          trashed: true,
        });
        if (!group) continue;
        if (!group.trashed) continue;
        if (SYSTEM_GROUP_SLUGS.has(group.slug)) continue;

        const usersInGroup = await this.userRepository.count({
          group: group._id,
        });
        if (usersInGroup > 0) continue;

        eligibleIds.push(group._id);
      }

      if (eligibleIds.length === 0) return right({ deleted: 0 });

      const deleted = await this.userGroupRepository.deleteMany(eligibleIds);
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
