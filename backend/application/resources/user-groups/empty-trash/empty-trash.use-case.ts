import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { SYSTEM_GROUP_SLUGS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';

type Response = Either<HTTPException, { deleted: number }>;

@Service()
export default class UserGroupEmptyTrashUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly userRepository: UserContractRepository,
  ) {}

  async execute(): Promise<Response> {
    try {
      const trashed = await this.userGroupRepository.findManyTrashed();

      const eligibleIds: string[] = [];
      for (const group of trashed) {
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
      console.error('[user-groups > empty-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'EMPTY_TRASH_GROUPS_ERROR',
        ),
      );
    }
  }
}
